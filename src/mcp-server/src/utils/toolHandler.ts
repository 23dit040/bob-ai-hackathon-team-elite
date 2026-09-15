import { logger } from './logger.js';

export interface ToolResult {
  [x: string]: unknown;
  isError?: boolean;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export async function handleToolCall<T>(
  toolName: string,
  fn: () => Promise<T>,
): Promise<ToolResult> {
  try {
    const result = await fn();
    return {
      content: [
        {
          type: 'text' as const,
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ tool: toolName, error: message }, 'Tool execution error');
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: false,
              error: message,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
