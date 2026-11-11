import cors, { CorsOptions } from 'cors';
import { env } from './env';

const origins = env.CORS_ORIGIN.split(',').map(o => o.trim());

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (origins.includes('*') || origins.includes(origin) || origins.some(o => origin.endsWith(o.replace(/^https?:\/\//, ''))) || env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shop-Id', 'X-Device-Id', 'X-Idempotency-Key']
};

export const corsMiddleware = cors(corsOptions);
