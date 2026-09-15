import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { searchSimilarDeviationsSchema } from '../utils/inputSchemas.js';
import { logger } from '../utils/logger.js';

export function registerSearchSimilarDeviations(server: McpServer): void {
  server.tool(
    'search_similar_deviations',
    'Semantic search across all recorded protocol deviations. Uses vector similarity to find deviations similar to the provided query text. Useful for precedent lookup and CAPA preparation.',
    {
      query: z.string().min(1).describe('Natural language description of the deviation to search for'),
      topK: z.number().int().positive().max(20).optional().default(5).describe('Number of similar deviations to return (default 5, max 20)'),
    },
    async (rawInput) => {
      const input = searchSimilarDeviationsSchema.parse(rawInput);
      logger.info({ tool: 'search_similar_deviations', query: input.query }, 'Tool invoked');

      const results = await backendClient.searchSimilarDeviations({
        query: input.query,
        topK: input.topK,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
