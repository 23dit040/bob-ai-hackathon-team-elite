import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { listHighRiskSitesSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerListHighRiskSites(server: McpServer): void {
  server.tool(
    'list_high_risk_sites',
    'List clinical trial sites ranked by risk score. Returns sites above the specified risk threshold, sorted highest risk first.',
    {
      limit: z.number().int().positive().max(200).optional().default(50).describe('Maximum number of sites to return (default 50)'),
      threshold: z.number().min(0).max(100).optional().default(50).describe('Minimum risk score threshold 0-100 (default 50)'),
    },
    async (rawInput) => {
      const input = listHighRiskSitesSchema.parse(rawInput);
      logger.info({ tool: 'list_high_risk_sites', input }, 'Tool invoked');

      const sites = await backendClient.listHighRiskSites({
        limit: input.limit,
        threshold: input.threshold,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(sites, null, 2) }],
      };
    },
  );
}
