import { Patient, PatientDocument } from '../models/Patient.js';
import { Visit, VisitDocument } from '../models/Visit.js';
import { CacheService } from './CacheService.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const cache = new CacheService(120); // 2-minute TTL

export interface PatientListParams {
  siteId?: string;
  patientId?: string;
  page: number;
  limit: number;
}

export interface PatientWithVisits {
  patient: PatientDocument;
  visits: VisitDocument[];
}

export class PatientService {
  /**
   * List patients with optional filters and pagination.
   */
  async listPatients(params: PatientListParams): Promise<{
    data: PatientDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { siteId, patientId, page, limit } = params;
    const cacheKey = `patients:list:${JSON.stringify(params)}`;

    const cached = await cache.get<{ data: PatientDocument[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;

    const filter: Record<string, unknown> = {};
    if (siteId) filter['siteId'] = siteId;
    if (patientId) filter['patientId'] = patientId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Patient.find(filter).skip(skip).limit(limit).lean(),
      Patient.countDocuments(filter),
    ]);

    const result = { data: data as unknown as PatientDocument[], total, page, limit };
    await cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get a single patient by patientId, including all their visits.
   */
  async getPatientWithVisits(patientId: string): Promise<PatientWithVisits> {
    const cacheKey = `patients:full:${patientId}`;
    const cached = await cache.get<PatientWithVisits>(cacheKey);
    if (cached) {
      logger.debug({ patientId }, 'PatientService: cache hit');
      return cached;
    }

    const patient = await Patient.findOne({ patientId }).lean();
    if (!patient) throw new NotFoundError(`Patient ${patientId}`);

    const visits = await Visit.find({ patientId }).sort({ visitNumber: 1 }).lean();
    const result: PatientWithVisits = {
      patient: patient as unknown as PatientDocument,
      visits: visits as unknown as VisitDocument[],
    };

    await cache.set(cacheKey, result);
    return result;
  }
}

export const patientService = new PatientService();
