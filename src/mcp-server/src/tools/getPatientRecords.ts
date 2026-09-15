import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { getPatientRecordsSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerGetPatientRecords(server: McpServer): void {
  server.tool(
    'get_patient_records',
    'Retrieve patient records from the clinical trial database. Filter by site or individual patient.',
    {
      siteId: z.string().optional().describe('Filter by site ID'),
      patientId: z.string().optional().describe('Retrieve a specific patient'),
      page: z.number().int().positive().optional().default(1).describe('Page number (default 1)'),
      limit: z.number().int().positive().max(200).optional().default(50).describe('Results per page (max 200, default 50)'),
    },
    async (rawInput) => {
      const input = getPatientRecordsSchema.parse(rawInput);
      logger.info({ tool: 'get_patient_records', input }, 'Tool invoked');

      const patients = await backendClient.getPatients({
        siteId: input.siteId,
        patientId: input.patientId,
        page: input.page,
        limit: input.limit,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(patients, null, 2),
          },
        ],
      };
    },
  );
}
