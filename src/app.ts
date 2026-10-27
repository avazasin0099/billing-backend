import express, { Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { corsMiddleware } from './config/cors';
import { env } from './config/env';
import { requestLogger, rateLimiter } from './middleware/request-logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import apiRouter from './routes';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // 2. CORS
  app.use(corsMiddleware);

  // 3. Request Logging & Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // 4. Rate Limiting
  app.use(rateLimiter({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX_REQUESTS }));

  // 5. Swagger API Docs Mock Definition
  const swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Bill Pro API',
      version: '1.0.0',
      description: 'Production Billing, Inventory, and GST API for Indian Retail Businesses',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/health': { get: { summary: 'Health check and database status' } },
      '/auth/signup': { post: { summary: 'Create business and owner user' } },
      '/auth/login': { post: { summary: 'Authenticate user and retrieve tokens' } },
      '/auth/pin-login': { post: { summary: 'Fast counter cashier PIN login' } },
      '/items': { get: { summary: 'List items catalog' }, post: { summary: 'Create new item' } },
      '/inventory/summary': { get: { summary: 'Get stock units and valuation' } },
      '/invoices': { get: { summary: 'List sales invoices' }, post: { summary: 'Create POS tax invoice' } },
      '/payments': { get: { summary: 'List payment records' }, post: { summary: 'Record manual payment' } },
      '/purchases': { get: { summary: 'List purchases' }, post: { summary: 'Record inward purchase' } },
      '/parties/customers': { get: { summary: 'List customers' }, post: { summary: 'Add customer' } },
      '/reports/sales': { get: { summary: 'Sales report and payment method totals' } },
      '/reports/gst': { get: { summary: 'GSTR-1 and GSTR-3B tax report' } },
      '/sync/events': { post: { summary: 'Push offline events queue' } },
    },
  };
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // 6. Mount API v1
  app.use('/api/v1', apiRouter);

  // 7. Error & Not Found Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
