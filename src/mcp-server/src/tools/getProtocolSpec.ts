import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { getProtocolSpecSchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerGetProtocolSpec(server: McpServer): void {
  server.tool(
    'get_protocol_spec',
    'Retrieve the full specification for a clinical trial protocol including visit schedule, required procedures, inclusion/exclusion criteria, and prohibited medications.',
    {
      protocolId: z.string().optional().describe('The protocol identifier (e.g. PROTO-001)'),
      protocol_id: z.string().optional().describe('Alias for protocolId'),
      trial_id: z.string().optional().describe('Alias for protocolId / trial identifier'),
      trialId: z.string().optional().describe('Alias for protocolId'),
    },
    async (rawInput) => {
      return handleToolCall('get_protocol_spec', async () => {
        const input = getProtocolSpecSchema.parse(rawInput);
        logger.info({ tool: 'get_protocol_spec', protocolId: input.protocolId }, 'Tool invoked');

        return backendClient.getProtocol(input.protocolId);
      });
    },
  );
}
