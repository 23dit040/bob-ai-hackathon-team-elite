export type DeviationSeverity = 'Major' | 'Minor' | 'Administrative';

export type DeviationStatus =
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'waived';

export interface PatientRecord {
  patientId: string;
  siteId: string;
  protocolId: string;
  enrollmentDate: string; // ISO 8601
  visits: VisitRecord[];
  demographics: {
    age: number;
    sex: 'M' | 'F' | 'Other';
    weight?: number;
    height?: number;
  };
}

export interface VisitRecord {
  visitId: string;
  patientId: string;
  siteId: string;
  protocolId: string;
  visitNumber: number;
  scheduledDate: string; // ISO 8601
  actualDate: string;    // ISO 8601
  completedProcedures: string[];
  requiredProcedures: string[];
  vitalSigns?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    temperature?: number;
  };
  labResults?: Record<string, number | string>;
  medicationAdherence?: number; // 0-100
  adverseEvents: string[];
  concomitantMedications: string[];
  notes?: string;
}

export interface ProtocolSpec {
  protocolId: string;
  name: string;
  version: string;
  phase: 'I' | 'II' | 'III' | 'IV';
  sponsor: string;
  visitSchedule: VisitScheduleEntry[];
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  requiredProcedures: Record<number, string[]>; // visitNumber -> procedures
  allowedWindowDays: {
    early: number;
    late: number;
  };
  prohibitedMedications: string[];
  primaryEndpoint: string;
  secondaryEndpoints: string[];
}

export interface VisitScheduleEntry {
  visitNumber: number;
  name: string;
  targetDay: number; // days from enrollment
  windowEarly: number;
  windowLate: number;
  procedures: string[];
  isMandatory: boolean;
}

export interface Deviation {
  deviationId: string;
  patientId: string;
  visitId: string;
  siteId: string;
  protocolId: string;
  detectedAt: string; // ISO 8601
  category: DeviationCategory;
  severity: DeviationSeverity;
  description: string;
  protocolSection: string;
  status: DeviationStatus;
  rootCause?: string;
  correctiveAction?: string;
  resolvedAt?: string;
  reportedBy?: string;
}

export type DeviationCategory =
  | 'missed_visit'
  | 'late_visit'
  | 'early_visit'
  | 'missed_procedure'
  | 'prohibited_medication'
  | 'eligibility_violation'
  | 'consent_issue'
  | 'data_collection_error'
  | 'dosing_error'
  | 'other';

export interface Site {
  siteId: string;
  name: string;
  location: {
    city: string;
    country: string;
    region?: string;
  };
  principalInvestigator: string;
  enrollmentCount: number;
  activePatients: number;
  activeSince: string; // ISO 8601
  riskScore?: number;
  riskTier?: 'critical' | 'high' | 'medium' | 'low';
}

export interface SiteRiskScore {
  siteId: string;
  siteName: string;
  riskScore: number; // 0-100
  riskTier: 'critical' | 'high' | 'medium' | 'low';
  totalDeviations: number;
  majorDeviations: number;
  minorDeviations: number;
  administrativeDeviations: number;
  deviationRate: number; // deviations per visit
  openDeviations: number;
  lastCalculatedAt: string; // ISO 8601
  trend: 'improving' | 'stable' | 'worsening';
}

export interface CAPAReport {
  reportId: string;
  siteId: string;
  generatedAt: string; // ISO 8601
  deviationIds: string[];
  summary: string;
  rootCauseAnalysis: string;
  correctiveActions: CAPAAction[];
  preventiveActions: CAPAAction[];
  timeline: string;
  responsibleParty: string;
  status: 'draft' | 'submitted' | 'approved';
  rawMarkdown: string;
}

export interface CAPAAction {
  description: string;
  dueDate: string;
  owner: string;
  priority: 'immediate' | 'short_term' | 'long_term';
}

export interface SimilarDeviation {
  deviationId: string;
  siteId: string;
  description: string;
  severity: DeviationSeverity;
  category: DeviationCategory;
  similarity: number; // 0-1
}

// ── API Response wrappers ─────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ── Pagination ────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DeviationFilters extends PaginationParams {
  siteId?: string;
  patientId?: string;
  severity?: DeviationSeverity;
  status?: DeviationStatus;
  category?: DeviationCategory;
  from?: string;
  to?: string;
}
