import { createApp } from './app';
import { env } from './config/env';
import { initSequelize } from './config/database';
import { initializeDatabaseModels } from './database/associations';
import { logger } from './config/logger';

const startServer = async () => {
  try {
    logger.info('Initializing Bill Pro backend database...');
    await initSequelize();
    initializeDatabaseModels();
    logger.info('Database initialized.');

    const app = createApp();

    const server = app.listen(env.PORT, env.HOST, () => {
      logger.info(`Bill Pro API server is running on http://${env.HOST}:${env.PORT}`);
      logger.info(`  - Local:   http://localhost:${env.PORT}/api/v1`);
      logger.info(`  - Network: http://0.0.0.0:${env.PORT}/api/v1`);
      logger.info(`  - Swagger: http://localhost:${env.PORT}/api/docs`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
