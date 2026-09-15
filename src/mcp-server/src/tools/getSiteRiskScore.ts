import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { getSiteRiskScoreSchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerGetSiteRiskScore(server: McpServer): void {
  server.tool(
    'get_site_risk_score',
    'Get the current risk score (0-100) and risk tier for a specific clinical trial site, including breakdown by deviation severity and contributing factors.',
    {
      siteId: z.string().optional().describe('The site identifier (e.g. SITE-001)'),
      site_id: z.string().optional().describe('Alias for siteId'),
    },
    async (rawInput) => {
      return handleToolCall('get_site_risk_score', async () => {
        const input = getSiteRiskScoreSchema.parse(rawInput);
        logger.info({ tool: 'get_site_risk_score', siteId: input.siteId }, 'Tool invoked');

        return backendClient.getSiteRiskScore(input.siteId);
      });
    },
  );
}
