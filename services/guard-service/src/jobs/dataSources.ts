import { exit } from 'process';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';

import { dataSource } from '../db/dataSource';

const logger = DefaultLogger.getInstance().child(import.meta.url);

const initDataSources = async (): Promise<void> => {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    logger.info('Datasource has been initialized!');
  } catch (err) {
    logger.error(`An error occurred while initializing datasource: ${err}`);
    logger.error(err.stack);
    exit(1);
  }
};

export { initDataSources };
