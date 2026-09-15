import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { getProtocolSpecSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerGetProtocolSpec(server: McpServer): void {
  server.tool(
    'get_protocol_spec',
    'Retrieve the full specification for a clinical trial protocol including visit schedule, required procedures, inclusion/exclusion criteria, and prohibited medications.',
    {
      protocolId: z.string().min(1).describe('The protocol identifier'),
    },
    async (rawInput) => {
      const input = getProtocolSpecSchema.parse(rawInput);
      logger.info({ tool: 'get_protocol_spec', protocolId: input.protocolId }, 'Tool invoked');

      const protocol = await backendClient.getProtocol(input.protocolId);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(protocol, null, 2) }],
      };
    },
  );
}
