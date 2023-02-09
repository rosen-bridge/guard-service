import { dataSource } from '../../config/dataSource';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

const initDataSources = async (): Promise<void> => {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    logger.info('Datasource has been initialized!');
  } catch (err) {
    logger.error(`An error occurred while initializing datasource: ${err}`);
    logger.error(err.stack);
  }
};

export { initDataSources };
