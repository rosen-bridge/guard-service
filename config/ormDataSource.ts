import path from 'path';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';

import { BlockEntity } from '@rosen-bridge/scanner';
import {
  CommitmentEntity,
  EventTriggerEntity,
} from '@rosen-bridge/watcher-data-extractor';

import { ConfirmedEventEntity } from '../src/db/entities/ConfirmedEventEntity';
import { TransactionEntity } from '../src/db/entities/TransactionEntity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: datasource config
//  fix entities directories
//  fix migrations (use package migrations)
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/18
export const ormDataSource = new DataSource({
  type: 'sqlite',
  database: __dirname + '/../sqlite/db.sqlite',
  entities: [
    BlockEntity,
    CommitmentEntity,
    ConfirmedEventEntity,
    EventTriggerEntity,
    TransactionEntity,
  ],
  migrations: ['src/db/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
