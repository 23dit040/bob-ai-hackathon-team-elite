import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { generateCapaReportSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerGenerateCapaReport(server: McpServer): void {
  server.tool(
    'generate_capa_report',
    'Generate a Corrective and Preventive Action (CAPA) report for a site. Analyzes the specified deviations and produces a structured report with root cause analysis, corrective actions, and preventive measures using AI.',
    {
      siteId: z.string().min(1).describe('The site for which to generate the CAPA report'),
      deviationIds: z.array(z.string().min(1)).min(1).max(50).describe('List of deviation IDs to include in the report (1-50)'),
    },
    async (rawInput) => {
      const input = generateCapaReportSchema.parse(rawInput);
      logger.info(
        { tool: 'generate_capa_report', siteId: input.siteId, count: input.deviationIds.length },
        'Tool invoked',
      );

      const report = await backendClient.generateCapaReport({
        siteId: input.siteId,
        deviationIds: input.deviationIds,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }],
      };
    },
  );
}
