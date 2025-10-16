import { DataSource } from '@rosen-bridge/extended-typeorm';
import Configs from '../configs/configs';

import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/abstract-scanner';
import {
  CommitmentEntity,
  EventTriggerEntity,
  migrations as watcherDataExtractorMigrations,
} from '@rosen-bridge/watcher-data-extractor';

import { ConfirmedEventEntity } from './entities/confirmedEventEntity';
import { TransactionEntity } from './entities/transactionEntity';
import { RevenueEntity } from './entities/revenueEntity';
import { RevenueChartView } from './entities/revenueChartView';
import { RevenueView } from './entities/revenueView';

import migrations from './migrations';
import { EventView } from './entities/eventView';
import {
  AddressTxsEntity,
  migrations as addressTxExtractorMigrations,
} from '@rosen-bridge/evm-address-tx-extractor';
import { ArbitraryEntity } from './entities/arbitraryEntity';
import { ReprocessEntity } from './entities/reprocessEntity';
import { ChainAddressBalanceEntity } from './entities/chainAddressBalanceEntity';

const dbType = Configs.dbType as keyof typeof migrations;
const dbConfigs = {
  entities: [
    BlockEntity,
    ExtractorStatusEntity,
    CommitmentEntity,
    EventTriggerEntity,
    ConfirmedEventEntity,
    TransactionEntity,
    RevenueEntity,
    RevenueView,
    RevenueChartView,
    EventView,
    AddressTxsEntity,
    ArbitraryEntity,
    ReprocessEntity,
    ChainAddressBalanceEntity,
  ],
  migrations: [
    ...scannerMigrations[dbType],
    ...watcherDataExtractorMigrations[dbType],
    ...addressTxExtractorMigrations[dbType],
    ...migrations[dbType],
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
  });
}

export { dataSource };
