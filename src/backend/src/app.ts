import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { patientsRouter } from './routes/patients.js';
import { protocolsRouter } from './routes/protocols.js';
import { deviationsRouter } from './routes/deviations.js';
import { sitesRouter } from './routes/sites.js';
import { reportsRouter } from './routes/reports.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security middleware ───────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );

  // ── Rate limiting ─────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request logging ───────────────────────────────────────────
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });

  // ── Routes ────────────────────────────────────────────────────
  app.use('/', healthRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/protocols', protocolsRouter);
  app.use('/api/deviations', deviationsRouter);
  app.use('/api/sites', sitesRouter);
  app.use('/api/reports', reportsRouter);

  // ── 404 handler ───────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  // ── Centralized error handler (must be last) ──────────────────
  app.use(errorHandler);

  return app;
}
