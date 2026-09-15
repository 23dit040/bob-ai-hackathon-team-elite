export const DEVIATION_SEVERITY_WEIGHTS: Record<string, number> = {
  Major: 10,
  Minor: 3,
  Administrative: 1,
};

export const RISK_TIER_THRESHOLDS = {
  critical: 75,
  high: 50,
  medium: 25,
  low: 0,
} as const;

export const DEVIATION_CATEGORIES = [
  'missed_visit',
  'late_visit',
  'early_visit',
  'missed_procedure',
  'prohibited_medication',
  'eligibility_violation',
  'consent_issue',
  'data_collection_error',
  'dosing_error',
  'other',
] as const;

export const PROTOCOL_PHASES = ['I', 'II', 'III', 'IV'] as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 50,
  maxLimit: 200,
} as const;

export const CACHE_TTL = {
  riskScore: 300,        // 5 minutes
  patientList: 60,       // 1 minute
  protocolSpec: 3600,    // 1 hour
  highRiskSites: 120,    // 2 minutes
} as const;
