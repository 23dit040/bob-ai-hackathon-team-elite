import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import http from 'http';
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

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'ctrm-mcp-server',
    version: '0.1.0',
    description: 'Clinical Trial Risk Monitor MCP Server — detects protocol deviations, scores site risk, generates CAPA reports.',
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

  logger.info('All 8 CTRM MCP tools registered');
  return server;
}

export async function startServer(): Promise<void> {
  logger.info({ transport: env.MCP_TRANSPORT, port: env.MCP_PORT }, 'Starting CTRM MCP server');

  if (env.MCP_TRANSPORT === 'stdio') {
    // ── stdio transport — for IBM Bob integration ─────────────────
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('CTRM MCP server running on stdio transport');

  } else {
    // ── SSE transport — for Docker/container use ──────────────────
    const server = createServer();

    // Each SSE client connection gets its own transport instance
    const transports = new Map<string, SSEServerTransport>();

    const httpServer = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${env.MCP_PORT}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health endpoint
      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'ctrm-mcp-server', transport: 'sse' }));
        return;
      }

      // SSE endpoint — Bob connects here
      if (req.method === 'GET' && url.pathname === '/sse') {
        const transport = new SSEServerTransport('/message', res);
        const sessionId = transport.sessionId;
        transports.set(sessionId, transport);
        logger.info({ sessionId }, 'MCP SSE client connected');

        server.connect(transport).catch((err) => {
          logger.error({ err, sessionId }, 'MCP SSE connect error');
        });

        res.on('close', () => {
          transports.delete(sessionId);
          logger.info({ sessionId }, 'MCP SSE client disconnected');
        });
        return;
      }

      // Message endpoint — Bob posts MCP messages here
      if (req.method === 'POST' && url.pathname === '/message') {
        const sessionId = url.searchParams.get('sessionId') ?? '';
        const transport = transports.get(sessionId);
        if (!transport) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }
        transport.handlePostMessage(req, res).catch((err) => {
          logger.error({ err, sessionId }, 'MCP message handling error');
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    httpServer.listen(env.MCP_PORT, () => {
      logger.info({ port: env.MCP_PORT }, 'CTRM MCP server running on SSE transport');
      logger.info(`  SSE endpoint: http://localhost:${env.MCP_PORT}/sse`);
      logger.info(`  Health:       http://localhost:${env.MCP_PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM — shutting down MCP SSE server');
      httpServer.close(() => process.exit(0));
    });
    process.on('SIGINT', () => {
      httpServer.close(() => process.exit(0));
    });
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  startServer().catch((err) => {
    logger.error({ err }, 'Fatal MCP server error');
    process.exit(1);
  });
}
