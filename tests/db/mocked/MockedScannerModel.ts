import path from 'path';
import { anything, spy, when } from 'ts-mockito';
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

import { ConfirmedEventEntity } from '../../../src/db/entities/ConfirmedEventEntity';
import { TransactionEntity } from '../../../src/db/entities/TransactionEntity';

import migrations from '../../../src/db/migrations';

import { EventTrigger, PaymentTransaction } from '../../../src/models/Models';

import { dbAction, DatabaseAction } from '../../../src/db/DatabaseAction';

import Utils from '../../../src/helpers/Utils';
import { loggerFactory } from '../../../src/log/Logger';

import TestUtils from '../../testUtils/TestUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = loggerFactory(import.meta.url);

const testScannerDataSource = new DataSource({
  type: 'sqlite',
  database: __dirname + '/../sqlite/test/db.sqlite',
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

try {
  await testScannerDataSource.initialize();
  await testScannerDataSource.runMigrations();
  logger.info('Test Data Source has been initialized!');
} catch (err) {
  logger.error(
    `An error occurred while initializing test datasource: ${err.stack}`
  );
}

const testScannerDataBase = new DatabaseAction(testScannerDataSource);

// mock all scannerAction methods to call test database methods
const mockedScannerAction = spy(dbAction);
when(mockedScannerAction.setEventStatus(anything(), anything())).thenCall(
  testScannerDataBase.setEventStatus
);
when(mockedScannerAction.getEventById(anything())).thenCall(
  testScannerDataBase.getEventById
);
when(mockedScannerAction.getPendingEvents()).thenCall(
  testScannerDataBase.getPendingEvents
);
when(mockedScannerAction.getWaitingEvents()).thenCall(
  testScannerDataBase.getWaitingEvents
);
when(mockedScannerAction.getActiveTransactions()).thenCall(
  testScannerDataBase.getActiveTransactions
);
when(mockedScannerAction.setTxStatus(anything(), anything())).thenCall(
  testScannerDataBase.setTxStatus
);
when(mockedScannerAction.updateTxLastCheck(anything(), anything())).thenCall(
  testScannerDataBase.updateTxLastCheck
);
when(
  mockedScannerAction.setEventStatusToPending(anything(), anything())
).thenCall(testScannerDataBase.setEventStatusToPending);
when(mockedScannerAction.getTxById(anything())).thenCall(
  testScannerDataBase.getTxById
);
when(mockedScannerAction.updateWithSignedTx(anything(), anything())).thenCall(
  testScannerDataBase.updateWithSignedTx
);
when(mockedScannerAction.insertTx(anything())).thenCall(
  testScannerDataBase.insertTx
);
when(mockedScannerAction.getEventTxsByType(anything(), anything())).thenCall(
  testScannerDataBase.getEventTxsByType
);
when(mockedScannerAction.replaceTx(anything(), anything())).thenCall(
  testScannerDataBase.replaceTx
);
when(mockedScannerAction.getValidCommitments(anything(), anything())).thenCall(
  testScannerDataBase.getValidCommitments
);
when(mockedScannerAction.getUnspentEvents()).thenCall(
  testScannerDataBase.getUnspentEvents
);
when(mockedScannerAction.insertConfirmedEvent(anything())).thenCall(
  testScannerDataBase.insertConfirmedEvent
);
when(
  mockedScannerAction.getNonCompleteColdStorageTxsInChain(anything())
).thenCall(testScannerDataBase.getNonCompleteColdStorageTxsInChain);
when(mockedScannerAction.getUnsignedActiveTxsInChain(anything())).thenCall(
  testScannerDataBase.getUnsignedActiveTxsInChain
);
when(mockedScannerAction.getSignedActiveTxsInChain(anything())).thenCall(
  testScannerDataBase.getSignedActiveTxsInChain
);

/**
 * deletes every record in Event and Transaction table in ScannerDatabase
 */
const clearTables = async () => {
  await testScannerDataBase.CommitmentRepository.clear();
  await testScannerDataBase.TransactionRepository.clear();
  await testScannerDataBase.ConfirmedEventRepository.clear();
  await testScannerDataBase.EventRepository.clear();
};

/**
 * inserts a record to Event and ConfirmedEvent tables in db
 * @param event
 * @param status
 * @param boxSerialized
 * @param sourceChainHeight
 * @param firstTry
 * @param eventHeight
 */
const insertEventRecord = async (
  event: EventTrigger,
  status: string,
  boxSerialized = 'boxSerialized',
  sourceChainHeight = 300,
  firstTry?: string,
  eventHeight = 200
) => {
  await testScannerDataBase.EventRepository.createQueryBuilder()
    .insert()
    .values({
      extractor: 'extractor',
      boxId: TestUtils.generateRandomId(),
      boxSerialized: boxSerialized,
      block: 'blockId',
      height: eventHeight,
      fromChain: event.fromChain,
      toChain: event.toChain,
      fromAddress: event.fromAddress,
      toAddress: event.toAddress,
      amount: event.amount,
      bridgeFee: event.bridgeFee,
      networkFee: event.networkFee,
      sourceChainTokenId: event.sourceChainTokenId,
      targetChainTokenId: event.targetChainTokenId,
      sourceTxId: event.sourceTxId,
      sourceBlockId: event.sourceBlockId,
      WIDs: event.WIDs.join(','),
      sourceChainHeight: sourceChainHeight,
    })
    .execute();
  const eventData =
    await testScannerDataBase.EventRepository.createQueryBuilder()
      .select()
      .where('sourceTxId = :id', { id: event.sourceTxId })
      .getOne();
  await testScannerDataBase.ConfirmedEventRepository.createQueryBuilder()
    .insert()
    .values({
      id: Utils.txIdToEventId(event.sourceTxId),
      eventData: eventData!,
      status: status,
      firstTry: firstTry,
    })
    .execute();
};

/**
 * inserts a record only to Event table in db
 * @param event
 * @param boxSerialized
 * @param sourceChainHeight
 */
const insertOnyEventDataRecord = async (
  event: EventTrigger,
  boxSerialized = 'boxSerialized',
  sourceChainHeight = 200
) => {
  const height = 300;
  await testScannerDataBase.EventRepository.createQueryBuilder()
    .insert()
    .values({
      extractor: 'extractor',
      boxId: TestUtils.generateRandomId(),
      boxSerialized: boxSerialized,
      block: 'blockId',
      height: height,
      fromChain: event.fromChain,
      toChain: event.toChain,
      fromAddress: event.fromAddress,
      toAddress: event.toAddress,
      amount: event.amount,
      bridgeFee: event.bridgeFee,
      networkFee: event.networkFee,
      sourceChainTokenId: event.sourceChainTokenId,
      targetChainTokenId: event.targetChainTokenId,
      sourceTxId: event.sourceTxId,
      sourceBlockId: event.sourceBlockId,
      sourceChainHeight: sourceChainHeight,
      WIDs: event.WIDs.join(','),
    })
    .execute();
};

/**
 * inserts a record to Event table in ScannerDatabase
 * @param paymentTx
 * @param type
 * @param chain
 * @param status
 * @param lastCheck
 * @param eventId
 * @param lastStatusUpdate
 */
const insertTxRecord = async (
  paymentTx: PaymentTransaction,
  type: string,
  chain: string,
  status: string,
  lastCheck: number,
  eventId: string,
  lastStatusUpdate?: string
) => {
  const event = await testScannerDataBase.ConfirmedEventRepository.findOneBy({
    id: eventId,
  });
  await testScannerDataBase.TransactionRepository.insert({
    txId: paymentTx.txId,
    txJson: paymentTx.toJson(),
    type: type,
    chain: chain,
    status: status,
    lastCheck: lastCheck,
    event: event!,
    lastStatusUpdate: lastStatusUpdate,
  });
};

/**
 * inserts a record to Event table in
 * @param eventId
 * @param boxSerialized
 * @param height
 */
const insertCommitmentBoxRecord = async (
  eventId: string,
  boxSerialized: string,
  height: number
) => {
  await testScannerDataBase.CommitmentRepository.createQueryBuilder()
    .insert()
    .values({
      extractor: 'extractor',
      eventId: eventId,
      commitment: 'commitment',
      WID: 'WID',
      boxId: TestUtils.generateRandomId(),
      block: 'blockId',
      boxSerialized: boxSerialized,
      height: height,
    })
    .execute();
};

/**
 * returns all records in Event table in ScannerDatabase
 */
const allEventRecords = async () => {
  return await testScannerDataBase.ConfirmedEventRepository.createQueryBuilder()
    .select()
    .getMany();
};

/**
 * returns all records in Transaction table in ScannerDatabase
 */
const allTxRecords = async () => {
  return await testScannerDataBase.TransactionRepository.find({
    relations: ['event'],
  });
};

export {
  clearTables,
  insertEventRecord,
  insertOnyEventDataRecord,
  insertTxRecord,
  insertCommitmentBoxRecord,
  allEventRecords,
  allTxRecords,
};
