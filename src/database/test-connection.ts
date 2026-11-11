import { initSequelize } from '../config/database';
import { logger } from '../config/logger';
import { env } from '../config/env';

async function testConnection() {
  logger.info('Testing database connection...');
  if (env.DATABASE_URL) {
    const maskedUrl = env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
    logger.info(`Target: DATABASE_URL (${maskedUrl})`);
  } else {
    logger.info(`Target: ${env.DB_HOST}:${env.DB_PORT} (DB: ${env.DB_NAME}, User: ${env.DB_USER})`);
  }

  try {
    const sequelize = await initSequelize();
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();

    if (dialect === 'sqlite' && (Boolean(env.DATABASE_URL) || env.DB_DIALECT === 'postgres')) {
      logger.warn('WARNING: Failed to connect to Railway/PostgreSQL. Sequelize fell back to local SQLite (dev.sqlite).');
      logger.warn('Please check your Railway connection string, network access, and credentials.');
      process.exit(1);
    }

    const [results]: any = await sequelize.query('SELECT current_database() as db_name, version() as version;');
    logger.info('Database connection successful!');
    logger.info(`Dialect: ${dialect}`);
    if (results && results[0]) {
      logger.info(`Active Database: ${results[0].db_name}`);
      logger.info(`PostgreSQL Version: ${results[0].version?.split(',')[0]}`);
    }
    process.exit(0);
  } catch (err: any) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }
}

testConnection();

