import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { detectDeviationsSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerDetectDeviations(server: McpServer): void {
  server.tool(
    'detect_deviations',
    'Detect protocol deviations for a specific visit, site, or date range. Returns a list of deviations with category and preliminary severity.',
    {
      visitId: z.string().optional().describe('Detect deviations for a single visit'),
      siteId: z.string().optional().describe('Detect deviations across all visits at a site'),
      from: z.string().optional().describe('Start of date range (ISO 8601)'),
      to: z.string().optional().describe('End of date range (ISO 8601)'),
    },
    async (rawInput) => {
      const input = detectDeviationsSchema.parse(rawInput);
      logger.info({ tool: 'detect_deviations', input }, 'Tool invoked');

      const deviations = await backendClient.detectDeviations({
        visitId: input.visitId,
        siteId: input.siteId,
        from: input.from,
        to: input.to,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(deviations, null, 2) }],
      };
    },
  );
}
