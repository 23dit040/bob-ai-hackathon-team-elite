import { v4 as uuidv4 } from 'uuid';
import { Deviation, DeviationDocument } from '../models/Deviation.js';
import { Site } from '../models/Site.js';
import { riskScoreService } from './RiskScoreService.js';
import { llmService } from './LLMService.js';
import { CacheService } from './CacheService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const cache = new CacheService(1800); // 30-minute cache for CAPA reports

export interface CAPAAction {
  description: string;
  dueDate: string;
  owner: string;
  priority: 'immediate' | 'short_term' | 'long_term';
}

export interface CAPAReport {
  reportId: string;
  siteId: string;
  generatedAt: string;
  deviationIds: string[];
  summary: string;
  rootCauseAnalysis: string;
  correctiveActions: CAPAAction[];
  preventiveActions: CAPAAction[];
  timeline: string;
  responsibleParty: string;
  status: 'draft' | 'submitted' | 'approved';
  rawMarkdown: string;
  dataSourceNote: string;
}

export class CapaReportService {
  /**
   * Generate a CAPA-ready report for the specified deviations at a site.
   * LLM is ONLY used for narrative text.
   * All factual data comes from verified MongoDB records.
   * Risk scores come from the deterministic RiskScoreService.
   */
  async generateCapaReport(params: {
    siteId: string;
    deviationIds: string[];
  }): Promise<CAPAReport> {
    const { siteId, deviationIds } = params;
    const cacheKey = `capa:${siteId}:${deviationIds.sort().join(',')}`;
    const cached = await cache.get<CAPAReport>(cacheKey);
    if (cached) {
      logger.debug({ siteId }, 'CapaReportService: cache hit');
      return cached;
    }

    // ── 1. Retrieve verified data from MongoDB ─────────────────────
    const site = await Site.findOne({ siteId }).lean();
    if (!site) throw new NotFoundError(`Site ${siteId}`);

    const deviations = await Deviation.find({
      deviationId: { $in: deviationIds },
      siteId,
    }).lean() as unknown as DeviationDocument[];

    if (deviations.length === 0) {
      throw new ValidationError(
        `No deviations found for site ${siteId} with the provided IDs. Cannot generate CAPA without verified data.`,
      );
    }

    const missingIds = deviationIds.filter(
      (id) => !deviations.find((d) => d.deviationId === id),
    );
    if (missingIds.length > 0) {
      logger.warn({ missingIds }, 'Some deviation IDs not found — continuing with available data');
    }

    // ── 2. Deterministic risk score (no LLM) ──────────────────────
    const riskScore = await riskScoreService.calculateSiteRiskScore(siteId);

    // ── 3. Build deterministic corrective/preventive actions ───────
    const correctiveActions = this._buildCorrectiveActions(deviations);
    const preventiveActions = this._buildPreventiveActions(deviations, riskScore.riskTier);

    // ── 4. Build verified context for LLM ─────────────────────────
    const deviationSummary = deviations.map((d) =>
      `- [${d.severity}] ${d.category}: ${d.description} (Section: ${d.protocolSection}, Status: ${d.status})`
    ).join('\n');

    const systemPrompt = `You are a clinical trial compliance specialist generating a CAPA report.
You must ONLY use the verified data provided. Do NOT invent patient facts, visit outcomes, or risk scores.
Distinguish clearly between RETRIEVED FACTS and your RECOMMENDATIONS.
Risk scores and severity classifications are determined by the system, not by you.`;

    const userPrompt = `Generate a professional CAPA narrative for the following verified data:

Site: ${(site as { name: string }).name} (${siteId})
Risk Score: ${riskScore.riskScore}/100 (${riskScore.riskTier})
Contributing Factors: ${riskScore.contributingFactors.join('; ')}

Verified Protocol Deviations (${deviations.length} total):
${deviationSummary}

Write:
1. A root cause analysis section (based only on the deviations listed).
2. A timeline recommendation.
3. A responsible party designation.
Keep it concise and regulatory-appropriate (FDA audit ready).`;

    // ── 5. LLM narrative (clearly labelled) ───────────────────────
    let narrative: string;
    let llmProvider: string = 'none';
    try {
      const llmResult = await llmService.generate([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 800);
      narrative = llmResult.text;
      llmProvider = llmResult.provider;
    } catch (err) {
      logger.warn({ err }, 'LLM failed — using structured fallback narrative');
      narrative = `Root cause analysis is based on the ${deviations.length} verified deviation(s) listed. See corrective and preventive action tables for recommended remediation steps.`;
      llmProvider = 'fallback';
    }

    // ── 6. Build full CAPA report ──────────────────────────────────
    const now = new Date();
    const reportId = `CAPA-${siteId}-${now.toISOString().slice(0, 10)}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const dueDate30 = new Date(now.getTime() + 30 * 86_400_000).toISOString().split('T')[0];
    const dueDate90 = new Date(now.getTime() + 90 * 86_400_000).toISOString().split('T')[0];

    const rawMarkdown = this._buildMarkdown({
      reportId,
      site: site as { name: string; siteId: string },
      riskScore,
      deviations,
      narrative,
      correctiveActions,
      preventiveActions,
      dueDate30,
      dueDate90,
      llmProvider,
    });

    const report: CAPAReport = {
      reportId,
      siteId,
      generatedAt: now.toISOString(),
      deviationIds: deviations.map((d) => d.deviationId),
      summary: `CAPA report for site ${(site as { name: string }).name}: ${deviations.length} deviation(s), risk score ${riskScore.riskScore}/100 (${riskScore.riskTier}).`,
      rootCauseAnalysis: narrative,
      correctiveActions,
      preventiveActions,
      timeline: `Corrective actions due by ${dueDate30}. Preventive measures by ${dueDate90}.`,
      responsibleParty: `Principal Investigator, Site ${siteId}`,
      status: 'draft',
      rawMarkdown,
      dataSourceNote: 'All factual data retrieved from MongoDB. Risk scores calculated deterministically. Narrative text generated by LLM provider: ' + llmProvider,
    };

    await cache.set(cacheKey, report);
    return report;
  }

  private _buildCorrectiveActions(deviations: DeviationDocument[]): CAPAAction[] {
    const actions: CAPAAction[] = [];
    const now = new Date();

    const hasMajor = deviations.some((d) => d.severity === 'Major');
    const missedVisit = deviations.some((d) => d.category === 'missed_visit');
    const prohibitedMed = deviations.some((d) => d.category === 'prohibited_medication');
    const missedProc = deviations.some((d) => d.category === 'missed_procedure');
    const dosingError = deviations.some((d) => d.category === 'dosing_error');

    const dueImmediate = new Date(now.getTime() + 7 * 86_400_000).toISOString().split('T')[0];
    const dueShort = new Date(now.getTime() + 30 * 86_400_000).toISOString().split('T')[0];

    if (hasMajor) {
      actions.push({
        description: 'Conduct immediate site visit and review all open major deviations with the PI.',
        dueDate: dueImmediate,
        owner: 'Clinical Research Associate (CRA)',
        priority: 'immediate',
      });
    }
    if (missedVisit) {
      actions.push({
        description: 'Re-schedule missed visits within protocol-allowed window. Update visit log.',
        dueDate: dueImmediate,
        owner: 'Site Coordinator',
        priority: 'immediate',
      });
    }
    if (prohibitedMed) {
      actions.push({
        description: 'Remove prohibited medication from patient regimen. Notify Safety team. Document in eCRF.',
        dueDate: dueImmediate,
        owner: 'Principal Investigator',
        priority: 'immediate',
      });
    }
    if (missedProc) {
      actions.push({
        description: 'Schedule make-up procedures where clinically and protocol-allowable. Document rationale.',
        dueDate: dueShort,
        owner: 'Site Coordinator',
        priority: 'short_term',
      });
    }
    if (dosingError) {
      actions.push({
        description: 'Review IP accountability logs. Retrain site staff on dosing procedures.',
        dueDate: dueShort,
        owner: 'Site Pharmacist',
        priority: 'immediate',
      });
    }

    return actions.length > 0 ? actions : [{
      description: 'Review all identified deviations and document corrective steps in eCRF.',
      dueDate: dueShort,
      owner: 'Site Coordinator',
      priority: 'short_term',
    }];
  }

  private _buildPreventiveActions(
    deviations: DeviationDocument[],
    riskTier: string,
  ): CAPAAction[] {
    const now = new Date();
    const due60 = new Date(now.getTime() + 60 * 86_400_000).toISOString().split('T')[0];
    const due90 = new Date(now.getTime() + 90 * 86_400_000).toISOString().split('T')[0];
    const categories = [...new Set(deviations.map((d) => d.category))];

    const actions: CAPAAction[] = [
      {
        description: `Re-train site staff on protocol requirements for: ${categories.join(', ')}.`,
        dueDate: due60,
        owner: 'Training Coordinator',
        priority: 'short_term',
      },
      {
        description: 'Implement automated visit-window alerts in the CTMS for all future visits.',
        dueDate: due90,
        owner: 'IT / CTMS Administrator',
        priority: 'long_term',
      },
    ];

    if (riskTier === 'critical' || riskTier === 'high') {
      actions.unshift({
        description: 'Increase monitoring frequency to monthly visits for this site until risk tier improves.',
        dueDate: due60,
        owner: 'Sponsor / CRO Monitor',
        priority: 'short_term',
      });
    }

    return actions;
  }

  private _buildMarkdown(params: {
    reportId: string;
    site: { name: string; siteId: string };
    riskScore: { riskScore: number; riskTier: string; contributingFactors: string[] };
    deviations: DeviationDocument[];
    narrative: string;
    correctiveActions: CAPAAction[];
    preventiveActions: CAPAAction[];
    dueDate30: string;
    dueDate90: string;
    llmProvider: string;
  }): string {
    const { reportId, site, riskScore, deviations, narrative, correctiveActions, preventiveActions, llmProvider } = params;

    const deviationTable = deviations.map((d, i) =>
      `| ${i + 1} | ${d.deviationId} | ${d.severity} | ${d.category} | ${d.description.slice(0, 80)} | ${d.status} |`
    ).join('\n');

    const correctiveTable = correctiveActions.map((a, i) =>
      `| ${i + 1} | ${a.description} | ${a.dueDate} | ${a.owner} | ${a.priority} |`
    ).join('\n');

    const preventiveTable = preventiveActions.map((a, i) =>
      `| ${i + 1} | ${a.description} | ${a.dueDate} | ${a.owner} | ${a.priority} |`
    ).join('\n');

    return `# CAPA Report — ${reportId}

**Site:** ${site.name} (${site.siteId})
**Generated:** ${new Date().toISOString()}
**Risk Score:** ${riskScore.riskScore}/100 — **${riskScore.riskTier.toUpperCase()}**
**Status:** DRAFT — Pending PI Review

> ⚠️ Data Source: All patient records and deviation facts are retrieved from MongoDB.  
> Risk scores are calculated deterministically per ICH E6 GCP.  
> Narrative sections labelled [AI-GENERATED] are produced by LLM provider: ${llmProvider}.

---

## 1. Contributing Risk Factors (System-Calculated)

${riskScore.contributingFactors.map((f) => `- ${f}`).join('\n')}

---

## 2. Protocol Deviations (Verified Records)

| # | Deviation ID | Severity | Category | Description | Status |
|---|---|---|---|---|---|
${deviationTable}

---

## 3. Root Cause Analysis [AI-GENERATED]

${narrative}

---

## 4. Corrective Actions (Deterministic)

| # | Action | Due Date | Owner | Priority |
|---|---|---|---|---|
${correctiveTable}

---

## 5. Preventive Actions (Deterministic)

| # | Action | Due Date | Owner | Priority |
|---|---|---|---|---|
${preventiveTable}

---

## 6. Signatures

| Role | Name | Date |
|---|---|---|
| Principal Investigator | ________________ | ________ |
| CRA | ________________ | ________ |
| Sponsor Representative | ________________ | ________ |

---
*Generated by Clinical Trial Risk Monitor (CTRM) v0.1.0 — feature/mcp-server*
`;
  }
}

export const capaReportService = new CapaReportService();
