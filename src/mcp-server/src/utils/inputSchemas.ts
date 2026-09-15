import { z } from 'zod';

// ── Shared pagination ────────────────────────────────────────
const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(200).optional().default(50),
});

// ── Tool input schemas ────────────────────────────────────────

export const getPatientRecordsSchema = paginationSchema.extend({
  siteId: z.string().optional(),
  patientId: z.string().optional(),
});

export const getProtocolSpecSchema = z.object({
  protocolId: z.string().min(1),
});

export const detectDeviationsSchema = z.object({
  visitId: z.string().optional(),
  siteId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
}).refine(
  (data) => data.visitId ?? data.siteId ?? (data.from ?? data.to),
  { message: 'Provide at least one of: visitId, siteId, from/to range' },
);

export const classifySeveritySchema = z.object({
  deviationId: z.string().optional(),
  deviationText: z.string().min(1).optional(),
}).refine(
  (data) => data.deviationId ?? data.deviationText,
  { message: 'Provide either deviationId or deviationText' },
);

export const getSiteRiskScoreSchema = z.object({
  siteId: z.string().min(1),
});

export const listHighRiskSitesSchema = paginationSchema.extend({
  threshold: z.number().min(0).max(100).optional().default(50),
});

export const searchSimilarDeviationsSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().max(20).optional().default(5),
});

export const generateCapaReportSchema = z.object({
  siteId: z.string().min(1),
  deviationIds: z.array(z.string().min(1)).min(1).max(50),
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
