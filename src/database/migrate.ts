import { initSequelize } from '../config/database';
import { initializeDatabaseModels } from './associations';
import { logger } from '../config/logger';

export const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');
    const sequelize = await initSequelize();
    initializeDatabaseModels();
    
    // Sync models to database
    await sequelize.sync({ alter: true });
    logger.info('Database schema synchronized successfully!');
  } catch (error: any) {
    logger.error('Failed to run database migrations:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runMigrations().then(() => {
    logger.info('Migration complete. Exiting.');
    process.exit(0);
  });
}
