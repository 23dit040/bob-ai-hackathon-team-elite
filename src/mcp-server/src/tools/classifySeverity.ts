import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { classifySeveritySchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerClassifySeverity(server: McpServer): void {
  server.tool(
    'classify_severity',
    'Classify the severity of a protocol deviation as Major, Minor, or Administrative under ICH E6 GCP framing.',
    {
      deviationId: z.string().optional().describe('ID of an existing deviation to classify'),
      deviation_id: z.string().optional().describe('Alias for deviationId'),
      deviationText: z.string().min(1).optional().describe('Free-text description of the deviation to classify'),
      deviation_text: z.string().min(1).optional().describe('Alias for deviationText'),
    },
    async (rawInput) => {
      return handleToolCall('classify_severity', async () => {
        const input = classifySeveritySchema.parse(rawInput);
        logger.info({ tool: 'classify_severity', input }, 'Tool invoked');

        return backendClient.classifySeverity({
          deviationId: input.deviationId,
          deviationText: input.deviationText,
        });
      });
    },
  );
}
