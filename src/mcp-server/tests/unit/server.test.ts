import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from '../../src/index.js';
import { backendClient } from '../../src/client/BackendClient.js';

describe('MCP Server & Tool Discovery', () => {
  it('initializes the MCP server with metadata', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });

  it('registers all 8 required clinical trial monitor tools', () => {
    const server = createServer();
    // @ts-expect-error accessing private/internal registered tools
    const registeredTools = server._registeredTools ?? {};
    const toolNames = Object.keys(registeredTools);

    const expectedTools = [
      'get_patient_records',
      'get_protocol_spec',
      'detect_deviations',
      'classify_severity',
      'get_site_risk_score',
      'list_high_risk_sites',
      'search_similar_deviations',
      'generate_capa_report',
    ];

    for (const toolName of expectedTools) {
      expect(toolNames).toContain(toolName);
    }
  });
});

describe('MCP Tool Execution & Error Handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('get_patient_records', () => {
    it('executes successfully and returns structured JSON', async () => {
      const mockData = [{ patientId: 'PAT-001', siteId: 'SITE-001', visitsCount: 5 }];
      vi.spyOn(backendClient, 'getPatients').mockResolvedValue(mockData);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['get_patient_records'];
      const result = await tool.handler({ siteId: 'SITE-001' });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(mockData);
    });

    it('handles backend service failure gracefully', async () => {
      vi.spyOn(backendClient, 'getPatients').mockRejectedValue(
        new Error('[INTERNAL_SERVER_ERROR] Database query timeout'),
      );

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['get_patient_records'];
      const result = await tool.handler({ siteId: 'SITE-001' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Database query timeout');
    });

    it('handles unavailable service / network failure with structured error', async () => {
      vi.spyOn(backendClient, 'getPatients').mockRejectedValue(
        new Error('[SERVICE_UNAVAILABLE] Failed to connect to backend: fetch failed'),
      );

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['get_patient_records'];
      const result = await tool.handler({ siteId: 'SITE-001' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('SERVICE_UNAVAILABLE');
    });
  });

  describe('get_protocol_spec', () => {
    it('executes successfully with protocolId or trial_id', async () => {
      const mockProtocol = { protocolId: 'PROTO-001', title: 'Phase III Oncology Trial' };
      vi.spyOn(backendClient, 'getProtocol').mockResolvedValue(mockProtocol);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['get_protocol_spec'];
      const result = await tool.handler({ trial_id: 'PROTO-001' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockProtocol);
    });

    it('returns error on malformed/missing input', async () => {
      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['get_protocol_spec'];
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBeDefined();
    });
  });

  describe('detect_deviations', () => {
    it('executes successfully and returns detected deviations', async () => {
      const mockDeviations = [
        {
          deviation_id: 'DEV-001',
          patient_id: 'PAT-001',
          site_id: 'SITE-001',
          visit_id: 'VIS-001',
          protocol_clause: 'Clause 4.2',
          observed_value: '14 days late',
          expected_value: 'Within +/- 3 days',
          status: 'open',
        },
      ];
      vi.spyOn(backendClient, 'detectDeviations').mockResolvedValue(mockDeviations);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['detect_deviations'];
      const result = await tool.handler({ patient_id: 'PAT-001' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockDeviations);
    });

    it('returns structured error when no filters or identifiers are provided', async () => {
      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['detect_deviations'];
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
    });
  });

  describe('classify_severity', () => {
    it('executes classification under ICH E6 GCP framing', async () => {
      const mockClassification = {
        severity: 'Major',
        reasoning: 'Dosing deviation exceeds 20% threshold impacting patient safety',
        confidence: 0.95,
      };
      vi.spyOn(backendClient, 'classifySeverity').mockResolvedValue(mockClassification);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['classify_severity'];
      const result = await tool.handler({ deviation_id: 'DEV-001' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockClassification);
    });
  });

  describe('get_site_risk_score', () => {
    it('returns site risk score and contributing factors', async () => {
      const mockRisk = {
        site_id: 'SITE-001',
        risk_score: 78.5,
        risk_level: 'High',
        contributing_factors: ['Repeated missed visits', 'Major dose deviations'],
      };
      vi.spyOn(backendClient, 'getSiteRiskScore').mockResolvedValue(mockRisk);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['get_site_risk_score'];
      const result = await tool.handler({ site_id: 'SITE-001' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockRisk);
    });
  });

  describe('list_high_risk_sites', () => {
    it('returns ranked high-risk sites above threshold', async () => {
      const mockSites = [{ site_id: 'SITE-001', risk_score: 85 }];
      vi.spyOn(backendClient, 'listHighRiskSites').mockResolvedValue(mockSites);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['list_high_risk_sites'];
      const result = await tool.handler({ threshold: 70 });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockSites);
    });
  });

  describe('search_similar_deviations', () => {
    it('performs semantic search across ChromaDB vector retrieval', async () => {
      const mockResults = [
        { deviation_id: 'DEV-099', similarity: 0.91, description: 'Missed cycle 2 day 1' },
      ];
      vi.spyOn(backendClient, 'searchSimilarDeviations').mockResolvedValue(mockResults);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['search_similar_deviations'];
      const result = await tool.handler({ query_text: 'missed visit' });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockResults);
    });
  });

  describe('generate_capa_report', () => {
    it('generates grounded CAPA report with verified context', async () => {
      const mockReport = {
        site_id: 'SITE-001',
        report_id: 'CAPA-SITE-001-2026',
        root_cause_analysis: 'Staff turnover led to scheduling errors.',
        corrective_actions: ['Re-train study coordinators'],
        preventive_actions: ['Implement automated calendar reminders'],
      };
      vi.spyOn(backendClient, 'generateCapaReport').mockResolvedValue(mockReport);

      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['generate_capa_report'];
      const result = await tool.handler({
        site_id: 'SITE-001',
        deviation_ids: ['DEV-001'],
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(mockReport);
    });

    it('rejects empty input with structured error', async () => {
      const server = createServer();
      // @ts-expect-error accessing internal tool handler
      const tool = server._registeredTools['generate_capa_report'];
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(false);
    });
  });
});
