import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backendClient } from '../client/BackendClient.js';
import { searchSimilarDeviationsSchema } from '../utils/inputSchemas.js';
import { handleToolCall } from '../utils/toolHandler.js';
import { logger } from '../utils/logger.js';

export function registerSearchSimilarDeviations(server: McpServer): void {
  server.tool(
    'search_similar_deviations',
    'Semantic search across historical protocol deviations using ChromaDB vector similarity. Useful for precedent lookup and CAPA preparation.',
    {
      query: z.string().optional().describe('Natural language description of the deviation to search for'),
      query_text: z.string().optional().describe('Alias for query'),
      topK: z.number().int().positive().max(20).optional().default(5).describe('Number of similar deviations to return (default 5, max 20)'),
      top_k: z.number().int().positive().max(20).optional().describe('Alias for topK'),
    },
    async (rawInput) => {
      return handleToolCall('search_similar_deviations', async () => {
        const input = searchSimilarDeviationsSchema.parse(rawInput);
        logger.info({ tool: 'search_similar_deviations', query: input.query }, 'Tool invoked');

        return backendClient.searchSimilarDeviations({
          query: input.query,
          topK: input.topK,
        });
      });
    },
  );
}
