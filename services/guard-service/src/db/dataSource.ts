import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/abstract-scanner';
import {
  AddressTxsEntity,
  migrations as addressTxExtractorMigrations,
} from '@rosen-bridge/evm-address-tx-extractor';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  CommitmentEntity,
  EventTriggerEntity,
  migrations as watcherDataExtractorMigrations,
} from '@rosen-bridge/watcher-data-extractor';

import Configs from '../configs/configs';
import { ArbitraryEntity } from './entities/arbitraryEntity';
import { ChainAddressBalanceEntity } from './entities/chainAddressBalanceEntity';
import { ConfirmedEventEntity } from './entities/confirmedEventEntity';
import { EventView } from './entities/eventView';
import { ReprocessEntity } from './entities/reprocessEntity';
import { RevenueChartView } from './entities/revenueChartView';
import { RevenueEntity } from './entities/revenueEntity';
import { RevenueView } from './entities/revenueView';
import { TransactionEntity } from './entities/transactionEntity';
import migrations from './migrations';

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
