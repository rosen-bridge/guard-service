import { DataSource } from '@rosen-bridge/extended-typeorm';

export const mockDataSource = async () => {
  const testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [],
    migrations: [],
    synchronize: false,
    logging: false,
  });

  await testDataSource.initialize();

  return testDataSource;
};
