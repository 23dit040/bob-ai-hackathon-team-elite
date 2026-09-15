import { describe, it, expect } from 'vitest';
import {
  getPatientRecordsSchema,
  getProtocolSpecSchema,
  detectDeviationsSchema,
  classifySeveritySchema,
  getSiteRiskScoreSchema,
  listHighRiskSitesSchema,
  searchSimilarDeviationsSchema,
  generateCapaReportSchema,
} from '../../src/utils/inputSchemas.js';

describe('getPatientRecordsSchema', () => {
  it('accepts empty input (uses defaults)', () => {
    const result = getPatientRecordsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts siteId filter', () => {
    const result = getPatientRecordsSchema.safeParse({ siteId: 'SITE-001' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.siteId).toBe('SITE-001');
  });
});

describe('getProtocolSpecSchema', () => {
  it('requires protocolId', () => {
    expect(getProtocolSpecSchema.safeParse({}).success).toBe(false);
  });
  it('accepts valid protocolId', () => {
    expect(getProtocolSpecSchema.safeParse({ protocolId: 'PROTO-001' }).success).toBe(true);
  });
});

describe('detectDeviationsSchema', () => {
  it('accepts visitId', () => {
    expect(detectDeviationsSchema.safeParse({ visitId: 'VISIT-001' }).success).toBe(true);
  });
  it('accepts siteId', () => {
    expect(detectDeviationsSchema.safeParse({ siteId: 'SITE-001' }).success).toBe(true);
  });
  it('rejects input with no identifiers', () => {
    expect(detectDeviationsSchema.safeParse({}).success).toBe(false);
  });
});

describe('classifySeveritySchema', () => {
  it('accepts deviationId', () => {
    expect(classifySeveritySchema.safeParse({ deviationId: 'DEV-001' }).success).toBe(true);
  });
  it('accepts deviationText', () => {
    expect(classifySeveritySchema.safeParse({ deviationText: 'patient missed visit' }).success).toBe(true);
  });
  it('rejects empty input', () => {
    expect(classifySeveritySchema.safeParse({}).success).toBe(false);
  });
});

describe('generateCapaReportSchema', () => {
  it('requires siteId and deviationIds', () => {
    expect(generateCapaReportSchema.safeParse({}).success).toBe(false);
    expect(generateCapaReportSchema.safeParse({ siteId: 'SITE-001', deviationIds: [] }).success).toBe(false);
  });
  it('accepts valid input', () => {
    const result = generateCapaReportSchema.safeParse({
      siteId: 'SITE-001',
      deviationIds: ['DEV-001', 'DEV-002'],
    });
    expect(result.success).toBe(true);
  });
  it('rejects more than 50 deviation IDs', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `DEV-${i}`);
    expect(generateCapaReportSchema.safeParse({ siteId: 'SITE-001', deviationIds: ids }).success).toBe(false);
  });
});
