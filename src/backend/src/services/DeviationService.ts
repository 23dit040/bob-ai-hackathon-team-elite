import { v4 as uuidv4 } from 'uuid';
import { Deviation, DeviationDocument } from '../models/Deviation.js';
import { Visit, VisitDocument } from '../models/Visit.js';
import { Patient } from '../models/Patient.js';
import { protocolService } from './ProtocolService.js';
import { chromaService } from './ChromaService.js';
import { CacheService } from './CacheService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { ProtocolDocument } from '../models/Protocol.js';
import type { DeviationFilters } from './types.js';

const cache = new CacheService(60); // 1-minute TTL for deviation lists

// ── ICH E6 GCP severity classification rules ─────────────────────────────────
// Major: compromises patient safety, data integrity, or regulatory compliance
// Minor: departure from protocol but no direct safety/integrity impact
// Administrative: record-keeping, labelling, non-consequential gaps
const SEVERITY_RULES: Record<string, 'Major' | 'Minor' | 'Administrative'> = {
  missed_visit: 'Major',
  late_visit: 'Minor',
  early_visit: 'Minor',
  missed_procedure: 'Major',
  prohibited_medication: 'Major',
  eligibility_violation: 'Major',
  consent_issue: 'Major',
  dosing_error: 'Major',
  data_collection_error: 'Administrative',
  other: 'Minor',
};

const PROTOCOL_SECTION_MAP: Record<string, string> = {
  missed_visit: '§6.1 Visit Schedule Compliance',
  late_visit: '§6.1 Visit Schedule Compliance',
  early_visit: '§6.1 Visit Schedule Compliance',
  missed_procedure: '§8.3 Required Procedures',
  prohibited_medication: '§4.2 Concomitant Medications',
  eligibility_violation: '§3.1 Inclusion/Exclusion Criteria',
  consent_issue: '§2.1 Informed Consent',
  dosing_error: '§5.2 Investigational Product Administration',
  data_collection_error: '§8.1 Case Report Forms',
  other: '§1.0 General Protocol',
};

export class DeviationService {
  /**
   * Detect deviations for a visit, site, or date range.
   * Pure deterministic rule-based algorithm — no LLM involvement.
   */
  async detectDeviations(params: {
    visitId?: string;
    siteId?: string;
    patientId?: string;
    from?: string;
    to?: string;
  }): Promise<DeviationDocument[]> {
    const { visitId, siteId, patientId, from, to } = params;

    // Build visit query
    const visitFilter: Record<string, unknown> = {};
    if (visitId) visitFilter['visitId'] = visitId;
    if (siteId) visitFilter['siteId'] = siteId;
    if (patientId) visitFilter['patientId'] = patientId;
    if (from || to) {
      visitFilter['scheduledDate'] = {};
      if (from) (visitFilter['scheduledDate'] as Record<string, unknown>)['$gte'] = new Date(from);
      if (to) (visitFilter['scheduledDate'] as Record<string, unknown>)['$lte'] = new Date(to);
    }

    const visits = (await Visit.find(visitFilter).lean()) as unknown as VisitDocument[];
    if (visits.length === 0) return [];

    const detected: DeviationDocument[] = [];

    for (const visit of visits) {
      const patient = await Patient.findOne({ patientId: visit.patientId }).lean();
      if (!patient) continue;

      let protocol: ProtocolDocument;
      try {
        protocol = await protocolService.getProtocol(visit.protocolId);
      } catch {
        logger.warn({ visitId: visit.visitId }, 'Protocol not found, skipping visit');
        continue;
      }

      const newDeviations = await this._analyzeVisit(visit, protocol);

      for (const dev of newDeviations) {
        // Upsert — avoid duplicates
        const exists = await Deviation.findOne({
          patientId: dev.patientId,
          visitId: dev.visitId,
          category: dev.category,
        });
        if (!exists) {
          const saved = await Deviation.create(dev);
          detected.push(saved);

          // Index in ChromaDB for semantic search
          try {
            await chromaService.indexDeviation(saved);
          } catch (err) {
            logger.warn({ err, deviationId: saved.deviationId }, 'ChromaDB indexing failed');
          }
        }
      }
    }

    return detected;
  }

  /**
   * Deterministic rule engine: compare visit against protocol.
   */
  private async _analyzeVisit(
    visit: VisitDocument,
    protocol: ProtocolDocument,
  ): Promise<Partial<DeviationDocument>[]> {
    const deviations: Partial<DeviationDocument>[] = [];
    const scheduleEntry = protocol.visitSchedule.find(
      (s) => s.visitNumber === visit.visitNumber,
    );

    // ── 1. Visit window deviation ─────────────────────────────────
    if (scheduleEntry) {
      const enrollment = await Patient.findOne({ patientId: visit.patientId }).lean();
      if (enrollment) {
        const enrollDate = new Date((enrollment as { enrollmentDate: Date }).enrollmentDate);
        const actualDate = new Date(visit.actualDate);
        const scheduledDate = new Date(visit.scheduledDate);
        const daysDiff = Math.round(
          (actualDate.getTime() - scheduledDate.getTime()) / 86_400_000,
        );

        const earlyWindow = -(scheduleEntry.windowEarly ?? protocol.allowedWindowDays.early);
        const lateWindow = scheduleEntry.windowLate ?? protocol.allowedWindowDays.late;

        void enrollDate; // used for context

        if (daysDiff < earlyWindow) {
          deviations.push(this._buildDeviation(visit, 'early_visit',
            `Visit occurred ${Math.abs(daysDiff)}d early (window: -${Math.abs(earlyWindow)}d / +${lateWindow}d)`,
            String(scheduledDate.toISOString().split('T')[0]),
            String(actualDate.toISOString().split('T')[0]),
          ));
        } else if (daysDiff > lateWindow) {
          deviations.push(this._buildDeviation(visit, 'late_visit',
            `Visit occurred ${daysDiff}d late (window: -${Math.abs(earlyWindow)}d / +${lateWindow}d)`,
            String(scheduledDate.toISOString().split('T')[0]),
            String(actualDate.toISOString().split('T')[0]),
          ));
        }
      }
    }

    // ── 2. Missing mandatory procedures ──────────────────────────
    const requiredForVisit: string[] =
      protocol.requiredProcedures instanceof Map
        ? (protocol.requiredProcedures.get(String(visit.visitNumber)) ?? [])
        : ((protocol.requiredProcedures as unknown as Record<string, string[]>)[String(visit.visitNumber)] ?? []);

    const completed = new Set(visit.completedProcedures.map((p) => p.toLowerCase()));
    const missing = requiredForVisit.filter((p) => !completed.has(p.toLowerCase()));

    if (missing.length > 0) {
      deviations.push(this._buildDeviation(visit, 'missed_procedure',
        `Required procedures not completed: ${missing.join(', ')}`,
        missing.join(', '),
        requiredForVisit.join(', '),
      ));
    }

    // ── 3. Prohibited medications ────────────────────────────────
    if (visit.concomitantMedications.length > 0) {
      const prohibited = protocol.prohibitedMedications.map((m) => m.toLowerCase());
      const found = visit.concomitantMedications.filter((m) =>
        prohibited.some((p) => m.toLowerCase().includes(p)),
      );
      if (found.length > 0) {
        deviations.push(this._buildDeviation(visit, 'prohibited_medication',
          `Prohibited medication(s) taken: ${found.join(', ')}`,
          found.join(', '),
          'None permitted',
        ));
      }
    }

    // ── 4. Medication adherence < 80% ────────────────────────────
    if (
      visit.medicationAdherence !== undefined &&
      visit.medicationAdherence !== null &&
      visit.medicationAdherence < 80
    ) {
      deviations.push(this._buildDeviation(visit, 'dosing_error',
        `Medication adherence ${visit.medicationAdherence}% is below required 80%`,
        `${visit.medicationAdherence}%`,
        '≥80%',
      ));
    }

    return deviations;
  }

  private _buildDeviation(
    visit: VisitDocument,
    category: string,
    description: string,
    observedValue?: string,
    expectedValue?: string,
  ): Partial<DeviationDocument> {
    const severity = SEVERITY_RULES[category] ?? 'Minor';
    return {
      deviationId: `DEV-${uuidv4().toUpperCase().slice(0, 8)}`,
      patientId: visit.patientId,
      visitId: visit.visitId,
      siteId: visit.siteId,
      protocolId: visit.protocolId,
      detectedAt: new Date(),
      category,
      severity,
      description: observedValue && expectedValue ? `${description} (Observed: ${observedValue}, Expected: ${expectedValue})` : description,
      protocolSection: PROTOCOL_SECTION_MAP[category] ?? '§1.0 General Protocol',
      status: 'open',
    };
  }

  /**
   * Classify the severity of an existing or described deviation.
   */
  async classifySeverity(params: {
    deviationId?: string;
    deviationText?: string;
  }): Promise<{
    severity: 'Major' | 'Minor' | 'Administrative';
    confidence: number;
    reasoning: string;
    source: 'rule_engine' | 'text_analysis';
  }> {
    if (params.deviationId) {
      const dev = await Deviation.findOne({ deviationId: params.deviationId }).lean() as DeviationDocument | null;
      if (!dev) throw new NotFoundError(`Deviation ${params.deviationId}`);
      return {
        severity: dev.severity,
        confidence: 1.0,
        reasoning: `Classified by deterministic rule engine: category="${dev.category}" maps to "${dev.severity}" per ICH E6 GCP §5.1.`,
        source: 'rule_engine',
      };
    }

    if (!params.deviationText) throw new ValidationError('Provide deviationId or deviationText');

    // Keyword-based heuristic classification for free text
    const text = params.deviationText.toLowerCase();
    let severity: 'Major' | 'Minor' | 'Administrative' = 'Minor';
    let reasoning = 'Classified by keyword heuristic.';
    let confidence = 0.7;

    if (/(missed visit|prohibited med|eligibility|consent|dosing error|safety|serious|omission)/.test(text)) {
      severity = 'Major';
      reasoning = 'Text contains keywords associated with patient safety or regulatory compliance (ICH E6 §5.1).';
      confidence = 0.85;
    } else if (/(data entry|typo|administrative|labelling|form|record)/.test(text)) {
      severity = 'Administrative';
      reasoning = 'Text suggests a record-keeping or administrative error with no direct safety impact.';
      confidence = 0.75;
    }

    return { severity, confidence, reasoning, source: 'text_analysis' };
  }

  /**
   * List deviations with filtering, pagination, and caching.
   */
  async listDeviations(filters: DeviationFilters): Promise<{
    data: DeviationDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `deviations:list:${JSON.stringify(filters)}`;
    const cached = await cache.get<{ data: DeviationDocument[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 50, siteId, patientId, severity, status, category, from, to } = filters;
    const filter: Record<string, unknown> = {};
    if (siteId) filter['siteId'] = siteId;
    if (patientId) filter['patientId'] = patientId;
    if (severity) filter['severity'] = severity;
    if (status) filter['status'] = status;
    if (category) filter['category'] = category;
    if (from || to) {
      filter['detectedAt'] = {};
      if (from) (filter['detectedAt'] as Record<string, unknown>)['$gte'] = new Date(from);
      if (to) (filter['detectedAt'] as Record<string, unknown>)['$lte'] = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Deviation.find(filter).sort({ detectedAt: -1 }).skip(skip).limit(limit).lean(),
      Deviation.countDocuments(filter),
    ]);

    const result = { data: data as unknown as DeviationDocument[], total, page, limit };
    await cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get a single deviation by ID.
   */
  async getDeviation(deviationId: string): Promise<DeviationDocument> {
    const cacheKey = `deviation:${deviationId}`;
    const cached = await cache.get<DeviationDocument>(cacheKey);
    if (cached) return cached;

    const dev = (await Deviation.findOne({ deviationId }).lean()) as unknown as DeviationDocument | null;
    if (!dev) throw new NotFoundError(`Deviation ${deviationId}`);

    await cache.set(cacheKey, dev, 300);
    return dev;
  }
}

export const deviationService = new DeviationService();
