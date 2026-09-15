import { createApp } from './app.js';
import { connectMongoDB, disconnectMongoDB } from './db/mongodb.js';
import { connectRedis, disconnectRedis } from './services/CacheService.js';
import { seedService } from './services/SeedService.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info({ env: env.NODE_ENV }, 'Starting CTRM backend');

  // Connect to databases
  await connectMongoDB();
  await connectRedis();

  // Seed synthetic data on first run (idempotent)
  if (env.NODE_ENV !== 'test') {
    seedService.seed().catch((err) => {
      logger.error({ err }, 'Seed failed — server continues');
    });
  }

  const app = createApp();
  const server = app.listen(env.BACKEND_PORT, () => {
    logger.info({ port: env.BACKEND_PORT }, 'CTRM backend listening');
  });

  // ── Graceful shutdown ─────────────────────────────────────────
  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(() => {
      logger.info('HTTP server closed');
      disconnectMongoDB()
        .then(() => disconnectRedis())
        .then(() => {
          logger.info('All connections closed — exiting');
          process.exit(0);
        })
        .catch((err) => {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        });
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => { shutdown('SIGTERM'); });
  process.on('SIGINT', () => { shutdown('SIGINT'); });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
