import { z } from 'zod';

// ── Shared pagination ────────────────────────────────────────
const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(200).optional().default(50),
});

// ── Tool input schemas ────────────────────────────────────────

export const getPatientRecordsSchema = paginationSchema.extend({
  siteId: z.string().optional(),
  site_id: z.string().optional(),
  patientId: z.string().optional(),
  patient_id: z.string().optional(),
  visitId: z.string().optional(),
  visit_id: z.string().optional(),
}).transform((data) => ({
  siteId: data.siteId ?? data.site_id,
  patientId: data.patientId ?? data.patient_id,
  visitId: data.visitId ?? data.visit_id,
  page: data.page,
  limit: data.limit,
}));

export const getProtocolSpecSchema = z.object({
  protocolId: z.string().min(1).optional(),
  protocol_id: z.string().min(1).optional(),
  trial_id: z.string().min(1).optional(),
  trialId: z.string().min(1).optional(),
}).refine(
  (data) => Boolean(data.protocolId ?? data.protocol_id ?? data.trial_id ?? data.trialId),
  { message: 'Provide protocolId or trial_id' },
).transform((data) => ({
  protocolId: (data.protocolId ?? data.protocol_id ?? data.trial_id ?? data.trialId)!,
}));

export const detectDeviationsSchema = z.object({
  visitId: z.string().optional(),
  visit_id: z.string().optional(),
  siteId: z.string().optional(),
  site_id: z.string().optional(),
  patientId: z.string().optional(),
  patient_id: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (data) => Boolean(data.visitId ?? data.visit_id ?? data.siteId ?? data.site_id ?? data.patientId ?? data.patient_id ?? data.from ?? data.to),
  { message: 'Provide at least one of: visitId, siteId, patientId, from/to range' },
).transform((data) => ({
  visitId: data.visitId ?? data.visit_id,
  siteId: data.siteId ?? data.site_id,
  patientId: data.patientId ?? data.patient_id,
  from: data.from,
  to: data.to,
}));

export const classifySeveritySchema = z.object({
  deviationId: z.string().optional(),
  deviation_id: z.string().optional(),
  deviationText: z.string().min(1).optional(),
  deviation_text: z.string().min(1).optional(),
}).refine(
  (data) => Boolean(data.deviationId ?? data.deviation_id ?? data.deviationText ?? data.deviation_text),
  { message: 'Provide either deviationId (or deviation_id) or deviationText' },
).transform((data) => ({
  deviationId: data.deviationId ?? data.deviation_id,
  deviationText: data.deviationText ?? data.deviation_text,
}));

export const getSiteRiskScoreSchema = z.object({
  siteId: z.string().min(1).optional(),
  site_id: z.string().min(1).optional(),
}).refine(
  (data) => Boolean(data.siteId ?? data.site_id),
  { message: 'Provide siteId or site_id' },
).transform((data) => ({
  siteId: (data.siteId ?? data.site_id)!,
}));

export const listHighRiskSitesSchema = paginationSchema.extend({
  threshold: z.number().min(0).max(100).optional().default(50),
});

export const searchSimilarDeviationsSchema = z.object({
  query: z.string().min(1).optional(),
  query_text: z.string().min(1).optional(),
  topK: z.number().int().positive().max(20).optional().default(5),
  top_k: z.number().int().positive().max(20).optional(),
}).refine(
  (data) => Boolean(data.query ?? data.query_text),
  { message: 'Provide query or query_text' },
).transform((data) => ({
  query: (data.query ?? data.query_text)!,
  topK: data.top_k ?? data.topK,
}));

export const generateCapaReportSchema = z.object({
  siteId: z.string().min(1).optional(),
  site_id: z.string().min(1).optional(),
  deviationId: z.string().min(1).optional(),
  deviation_id: z.string().min(1).optional(),
  deviationIds: z.array(z.string().min(1)).min(1).max(50).optional(),
  deviation_ids: z.array(z.string().min(1)).min(1).max(50).optional(),
}).refine(
  (data) => Boolean(
    (data.siteId ?? data.site_id) &&
    (data.deviationIds ?? data.deviation_ids ?? data.deviationId ?? data.deviation_id),
  ),
  { message: 'Provide siteId (or site_id) and deviationIds (or deviation_id)' },
).transform((data) => {
  const siteId = (data.siteId ?? data.site_id)!;
  const singleId = data.deviationId ?? data.deviation_id;
  const ids = data.deviationIds ?? data.deviation_ids ?? (singleId ? [singleId] : []);
  return { siteId, deviationIds: ids };
});

// ── Inferred types ────────────────────────────────────────────

export type GetPatientRecordsInput = z.infer<typeof getPatientRecordsSchema>;
export type GetProtocolSpecInput = z.infer<typeof getProtocolSpecSchema>;
export type DetectDeviationsInput = z.infer<typeof detectDeviationsSchema>;
export type ClassifySeverityInput = z.infer<typeof classifySeveritySchema>;
export type GetSiteRiskScoreInput = z.infer<typeof getSiteRiskScoreSchema>;
export type ListHighRiskSitesInput = z.infer<typeof listHighRiskSitesSchema>;
export type SearchSimilarDeviationsInput = z.infer<typeof searchSimilarDeviationsSchema>;
export type GenerateCapaReportInput = z.infer<typeof generateCapaReportSchema>;
