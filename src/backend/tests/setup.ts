// Global test setup — runs before each test file
// Sets NODE_ENV so env.ts doesn't exit on missing variables
process.env['NODE_ENV'] = 'test';
process.env['BACKEND_PORT'] = '3001';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/ctrm_test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['CHROMA_URL'] = 'http://localhost:8000';
process.env['LLM_PROVIDER'] = 'none';
