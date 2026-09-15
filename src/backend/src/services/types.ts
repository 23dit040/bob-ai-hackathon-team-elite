/**
 * Shared filter/pagination types used across services.
 * Kept in services/ to avoid cross-package shared dependency issues.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DeviationFilters extends PaginationParams {
  siteId?: string;
  patientId?: string;
  severity?: 'Major' | 'Minor' | 'Administrative';
  status?: 'open' | 'under_review' | 'resolved' | 'waived';
  category?: string;
  from?: string;
  to?: string;
}
