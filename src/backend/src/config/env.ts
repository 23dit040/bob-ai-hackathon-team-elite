import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BACKEND_PORT: z.string().default('3001').transform(Number),
  MONGODB_URI: z.string().default('mongodb://admin:changeme@localhost:27017/ctrm?authSource=admin'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CHROMA_URL: z.string().default('http://localhost:8000'),
  CHROMA_COLLECTION: z.string().default('protocol_deviations'),
  LLM_PROVIDER: z.enum(['watsonx', 'openai', 'none']).default('none'),
  WATSONX_API_KEY: z.string().optional(),
  WATSONX_PROJECT_ID: z.string().optional(),
  WATSONX_URL: z.string().optional(),
  WATSONX_MODEL_ID: z.string().default('ibm/granite-13b-instruct-v2'),
  OPENAI_API_KEY: z.string().optional(),
  HF_MODEL_ID: z.string().default('distilbert-base-uncased'),
  HF_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
  RISK_SCORE_CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_PATIENT_COUNT: z.string().default('5000').transform(Number),
  SEED_SITE_COUNT: z.string().default('200').transform(Number),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env: Env = parsed.data;
