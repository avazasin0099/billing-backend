import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_DIALECT: (process.env.DB_DIALECT || 'postgres') as 'postgres' | 'sqlite',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'billpro_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_LOGGING: process.env.DB_LOGGING === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'billpro_dev_secret_key_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'billpro_dev_refresh_secret_key',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
};

// Fail fast in production if security-critical secrets were not overridden.
if (env.NODE_ENV === 'production') {
  const insecure: string[] = [];
  if (!process.env.JWT_SECRET || env.JWT_SECRET.includes('billpro_dev_secret')) insecure.push('JWT_SECRET');
  if (!process.env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.includes('billpro_dev_refresh')) {
    insecure.push('JWT_REFRESH_SECRET');
  }
  if (!process.env.DB_PASSWORD) insecure.push('DB_PASSWORD');
  if (insecure.length > 0) {
    throw new Error(
      `Refusing to boot in production with insecure/default secrets: ${insecure.join(', ')}. ` +
        `Set strong values via environment variables.`
    );
  }
}
