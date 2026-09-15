import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development' && env.MCP_TRANSPORT !== 'stdio'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: { service: 'ctrm-mcp-server' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
