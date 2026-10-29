import { Sequelize, Options } from 'sequelize';
import { Client } from 'pg';
import { env } from './env';
import { logger } from './logger';
import path from 'path';

let sequelize: Sequelize;

const getDatabaseConfig = (): Options => {
  if (env.DB_DIALECT === 'sqlite' || env.NODE_ENV === 'test') {
    return {
      dialect: 'sqlite',
      storage: env.NODE_ENV === 'test' ? ':memory:' : path.resolve(process.cwd(), 'dev.sqlite'),
      logging: env.DB_LOGGING ? (msg) => logger.debug(msg) : false,
    };
  }

  return {
    dialect: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    logging: env.DB_LOGGING ? (msg) => logger.debug(msg) : false,
    // Managed Postgres (Neon/Render/etc.) requires SSL; local/dev Postgres usually does not.
    dialectOptions:
      env.NODE_ENV === 'production'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };
};

const ensurePostgresDatabaseExists = async (): Promise<boolean> => {
  try {
    const client = new Client({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: 'postgres', // default administrative database
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [env.DB_NAME]);
    if (res.rowCount === 0) {
      logger.info(`PostgreSQL database "${env.DB_NAME}" does not exist. Creating it now...`);
      await client.query(`CREATE DATABASE "${env.DB_NAME}"`);
      logger.info(`Created PostgreSQL database "${env.DB_NAME}" successfully.`);
    }
    await client.end();
    return true;
  } catch (err: any) {
    logger.warn(`Could not verify/create PostgreSQL database automatically: ${err.message}`);
    return false;
  }
};

export const initSequelize = async (): Promise<Sequelize> => {
  if (sequelize) return sequelize;

  const config = getDatabaseConfig();

  if (config.dialect === 'postgres') {
    try {
      await ensurePostgresDatabaseExists();
      const pgSequelize = new Sequelize(config);
      await pgSequelize.authenticate();
      logger.info('Connected to PostgreSQL successfully');
      sequelize = pgSequelize;
      return sequelize;
    } catch (err: any) {
      logger.warn(`PostgreSQL connection failed (${err.message}). Falling back to local SQLite for seamless operation.`);
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.resolve(process.cwd(), 'dev.sqlite'),
        logging: false,
      });
      await sequelize.authenticate();
      logger.info('Connected to fallback SQLite database');
      return sequelize;
    }
  }

  sequelize = new Sequelize(config);
  await sequelize.authenticate();
  return sequelize;
};

export const getSequelize = (): Sequelize => {
  if (!sequelize) {
    const config = getDatabaseConfig();
    sequelize = new Sequelize(config);
  }
  return sequelize;
};

export { sequelize };
