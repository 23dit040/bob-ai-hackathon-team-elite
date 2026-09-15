import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { classifySeveritySchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerClassifySeverity(server: McpServer): void {
  server.tool(
    'classify_severity',
    'Classify the severity of a protocol deviation as Major, Minor, or Administrative. Accepts either an existing deviation ID or free-text description.',
    {
      deviationId: z.string().optional().describe('ID of an existing deviation to classify'),
      deviationText: z.string().min(1).optional().describe('Free-text description of the deviation to classify'),
    },
    async (rawInput) => {
      const input = classifySeveritySchema.parse(rawInput);
      logger.info({ tool: 'classify_severity', input }, 'Tool invoked');

      const result = await backendClient.classifySeverity({
        deviationId: input.deviationId,
        deviationText: input.deviationText,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
