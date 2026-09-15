import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { AppError, NotFoundError } from '../../src/utils/errors.js';
import { ZodError, z } from 'zod';

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/ok', (_req, res) => {
    res.json({ success: true, data: 'hello' });
  });
  app.get('/app-error', (_req, _res, next) => {
    next(new NotFoundError('Patient'));
  });
  app.get('/zod-error', (_req, _res, next) => {
    const result = z.object({ name: z.string() }).safeParse({});
    if (!result.success) next(result.error);
  });
  app.get('/unknown-error', (_req, _res, next) => {
    next(new Error('kaboom'));
  });

  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  const app = buildApp();

  it('passes through successful responses', async () => {
    const res = await request(app).get('/ok');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for NotFoundError', async () => {
    const res = await request(app).get('/app-error');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for ZodError', async () => {
    const res = await request(app).get('/zod-error');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 for unknown errors', async () => {
    const res = await request(app).get('/unknown-error');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    // must not leak internal message
    expect(res.body.error.message).not.toContain('kaboom');
  });
});
