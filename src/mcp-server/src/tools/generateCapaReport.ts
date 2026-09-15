import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { generateCapaReportSchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerGenerateCapaReport(server: McpServer): void {
  server.tool(
    'generate_capa_report',
    'Generate a Corrective and Preventive Action (CAPA) report for a site. Analyzes specified deviations and produces a structured report with root cause analysis, corrective actions, and preventive measures using AI grounded on verified data.',
    {
      siteId: z.string().optional().describe('The site for which to generate the CAPA report (e.g. SITE-001)'),
      site_id: z.string().optional().describe('Alias for siteId'),
      deviationId: z.string().optional().describe('Single deviation ID to include in the report'),
      deviation_id: z.string().optional().describe('Alias for deviationId'),
      deviationIds: z.array(z.string().min(1)).min(1).max(50).optional().describe('List of deviation IDs to include in the report (1-50)'),
      deviation_ids: z.array(z.string().min(1)).min(1).max(50).optional().describe('Alias for deviationIds'),
    },
    async (rawInput) => {
      return handleToolCall('generate_capa_report', async () => {
        const input = generateCapaReportSchema.parse(rawInput);
        logger.info(
          { tool: 'generate_capa_report', siteId: input.siteId, count: input.deviationIds.length },
          'Tool invoked',
        );

        return backendClient.generateCapaReport({
          siteId: input.siteId,
          deviationIds: input.deviationIds,
        });
      });
    },
  );
}
