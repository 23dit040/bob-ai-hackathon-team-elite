import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { getPatientRecordsSchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerGetPatientRecords(server: McpServer): void {
  server.tool(
    'get_patient_records',
    'Retrieve patient records from the clinical trial database. Filter by site, patient, or visit.',
    {
      siteId: z.string().optional().describe('Filter by site ID (e.g. SITE-001)'),
      site_id: z.string().optional().describe('Alias for siteId'),
      patientId: z.string().optional().describe('Filter by patient ID (e.g. PAT-001)'),
      patient_id: z.string().optional().describe('Alias for patientId'),
      visitId: z.string().optional().describe('Filter by visit ID'),
      visit_id: z.string().optional().describe('Alias for visitId'),
      page: z.number().int().positive().optional().default(1).describe('Page number (default 1)'),
      limit: z.number().int().positive().max(200).optional().default(50).describe('Results per page (max 200, default 50)'),
    },
    async (rawInput) => {
      return handleToolCall('get_patient_records', async () => {
        const input = getPatientRecordsSchema.parse(rawInput);
        logger.info({ tool: 'get_patient_records', input }, 'Tool invoked');

        return backendClient.getPatients({
          siteId: input.siteId,
          patientId: input.patientId,
          page: input.page,
          limit: input.limit,
        });
      });
    },
  );
}
