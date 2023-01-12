import { DataSource } from 'typeorm';
import Configs from '../src/helpers/Configs';

import {
  BlockEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';
import {
  CommitmentEntity,
  EventTriggerEntity,
  migrations as watcherDataExtractorMigrations,
} from '@rosen-bridge/watcher-data-extractor';

import { ConfirmedEventEntity } from '../src/db/entities/ConfirmedEventEntity';
import { TransactionEntity } from '../src/db/entities/TransactionEntity';

import migrations from '../src/db/migrations';

// TODO: datasource config
//  fix entities directories
//  fix migrations (use package migrations)
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/18
const dbConfigs = {
  entities: [
    BlockEntity,
    CommitmentEntity,
    ConfirmedEventEntity,
    EventTriggerEntity,
    TransactionEntity,
  ],
  synchronize: false,
  logging: false,
};
let dataSource: DataSource;
if (Configs.dbType === 'sqlite') {
  dataSource = new DataSource({
    type: 'sqlite',
    database: Configs.dbPath,
    ...dbConfigs,
    migrations: [
      ...scannerMigrations.sqlite,
      ...watcherDataExtractorMigrations.sqlite,
      ...migrations.sqlite,
    ],
  });
} else {
  dataSource = new DataSource({
    type: 'postgres',
    host: Configs.dbHost,
    port: Configs.dbPort,
    username: Configs.dbUser,
    password: Configs.dbPassword,
    database: Configs.dbName,
    ...dbConfigs,
    migrations: [
      ...scannerMigrations.postgres,
      ...watcherDataExtractorMigrations.postgres,
      ...migrations.postgres,
    ],
  });
}

export { dataSource };
