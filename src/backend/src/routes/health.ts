import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../services/CacheService.js';
import { logger } from '../utils/logger.js';

const router = Router();

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  checks: {
    mongodb: ServiceStatus;
    redis: ServiceStatus;
  };
}

router.get('/health', (_req: Request, res: Response): void => {
  void (async (): Promise<void> => {
  const checks: HealthResponse['checks'] = {
    mongodb: { status: 'down' },
    redis: { status: 'down' },
  };

  // MongoDB — readyState 1 = connected
  try {
    const start = Date.now();
    const state: number = mongoose.connection.readyState;
    checks.mongodb = {
      status: state === 1 ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    checks.mongodb = { status: 'down', error: String(err) };
  }

  // Redis
  try {
    const start = Date.now();
    await redisClient.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'down', error: String(err) };
  }

  const overallOk = Object.values(checks).every((c) => c.status === 'ok');
  const httpStatus = overallOk ? 200 : 503;
  const response: HealthResponse = {
    status: overallOk ? 'ok' : 'degraded',
    service: 'ctrm-backend',
    version: process.env['npm_package_version'] ?? '0.1.0',
    timestamp: new Date().toISOString(),
    checks,
  };

  if (!overallOk) {
    logger.warn({ checks }, 'Health check degraded');
  }

  res.status(httpStatus).json(response);
  })();
});

export { router as healthRouter };
