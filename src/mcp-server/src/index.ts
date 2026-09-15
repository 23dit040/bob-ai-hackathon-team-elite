import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { registerGetPatientRecords } from './tools/getPatientRecords.js';
import { registerGetProtocolSpec } from './tools/getProtocolSpec.js';
import { registerDetectDeviations } from './tools/detectDeviations.js';
import { registerClassifySeverity } from './tools/classifySeverity.js';
import { registerGetSiteRiskScore } from './tools/getSiteRiskScore.js';
import { registerListHighRiskSites } from './tools/listHighRiskSites.js';
import { registerSearchSimilarDeviations } from './tools/searchSimilarDeviations.js';
import { registerGenerateCapaReport } from './tools/generateCapaReport.js';

async function main(): Promise<void> {
  logger.info({ transport: env.MCP_TRANSPORT }, 'Starting CTRM MCP server');

  const server = new McpServer({
    name: 'ctrm-mcp-server',
    version: '0.1.0',
  });

  // ── Register all 8 tools ──────────────────────────────────────
  registerGetPatientRecords(server);
  registerGetProtocolSpec(server);
  registerDetectDeviations(server);
  registerClassifySeverity(server);
  registerGetSiteRiskScore(server);
  registerListHighRiskSites(server);
  registerSearchSimilarDeviations(server);
  registerGenerateCapaReport(server);

  logger.info('All 8 MCP tools registered');

  if (env.MCP_TRANSPORT === 'stdio') {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('MCP server running on stdio transport');
  } else {
    // SSE transport — for Docker/remote usage
    // Full SSE handler wired in feature/mcp-server branch
    logger.info({ port: env.MCP_PORT }, 'MCP server SSE mode — configure SSE transport here');
    // Keep process alive for SSE
    await new Promise(() => undefined);
  }
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
