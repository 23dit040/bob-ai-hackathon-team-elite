import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MCP_PORT: z.string().default('3002').transform(Number),
  MCP_TRANSPORT: z.enum(['stdio', 'sse']).default('stdio'),
  BACKEND_URL: z.string().default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type McpEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid MCP server environment:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env: McpEnv = parsed.data;
