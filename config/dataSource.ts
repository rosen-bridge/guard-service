import path from 'path';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: datasource config
//  fix entities directories
//  fix migrations (use package migrations)
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/18
export const dataSource = new DataSource({
  type: 'sqlite',
  database: __dirname + '/../sqlite/db.sqlite',
  entities: [
    BlockEntity,
    CommitmentEntity,
    ConfirmedEventEntity,
    EventTriggerEntity,
    TransactionEntity,
  ],
  migrations: [
    ...scannerMigrations.sqlite,
    ...watcherDataExtractorMigrations.sqlite,
    ...migrations,
  ],
  synchronize: false,
  logging: false,
});
