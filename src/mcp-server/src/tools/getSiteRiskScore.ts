import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { getSiteRiskScoreSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerGetSiteRiskScore(server: McpServer): void {
  server.tool(
    'get_site_risk_score',
    'Get the current risk score (0-100) and risk tier for a specific clinical trial site, including breakdown by deviation severity and trend.',
    {
      siteId: z.string().min(1).describe('The site identifier'),
    },
    async (rawInput) => {
      const input = getSiteRiskScoreSchema.parse(rawInput);
      logger.info({ tool: 'get_site_risk_score', siteId: input.siteId }, 'Tool invoked');

      const score = await backendClient.getSiteRiskScore(input.siteId);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(score, null, 2) }],
      };
    },
  );
}
