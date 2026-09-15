import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { detectDeviationsSchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerDetectDeviations(server: McpServer): void {
  server.tool(
    'detect_deviations',
    'Detect protocol deviations for a specific patient, visit, site, or date range. Returns a list of deviations with category and preliminary severity.',
    {
      patientId: z.string().optional().describe('Detect deviations for a single patient'),
      patient_id: z.string().optional().describe('Alias for patientId'),
      visitId: z.string().optional().describe('Detect deviations for a single visit'),
      visit_id: z.string().optional().describe('Alias for visitId'),
      siteId: z.string().optional().describe('Detect deviations across all visits at a site'),
      site_id: z.string().optional().describe('Alias for siteId'),
      from: z.string().optional().describe('Start of date range (ISO 8601)'),
      to: z.string().optional().describe('End of date range (ISO 8601)'),
    },
    async (rawInput) => {
      return handleToolCall('detect_deviations', async () => {
        const input = detectDeviationsSchema.parse(rawInput);
        logger.info({ tool: 'detect_deviations', input }, 'Tool invoked');

        return backendClient.detectDeviations({
          patientId: input.patientId,
          visitId: input.visitId,
          siteId: input.siteId,
          from: input.from,
          to: input.to,
        });
      });
    },
  );
}
