import { dataSource } from '../../config/dataSource';
import { logger } from '../log/Logger';

const initDataSources = async (): Promise<void> => {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    logger.info('Datasource has been initialized!');
  } catch (err) {
    logger.error(`An error occurred while initializing datasource: ${err}`);
  }
};

export { initDataSources };
