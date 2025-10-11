import { DataSource } from 'typeorm';

import {
  AddressTxsEntity,
  migrations,
} from '@rosen-bridge/evm-address-tx-extractor';

export const mockDataSource = async () => {
  const testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [AddressTxsEntity],
    migrations: [...migrations.sqlite],
    synchronize: false,
    logging: false,
  });

  await testDataSource.initialize();
  await testDataSource.runMigrations();

  return testDataSource;
};
