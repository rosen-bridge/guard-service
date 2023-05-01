import { vi } from 'vitest';
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
import { ConfirmedEventEntity } from '../../../src/db/entities/ConfirmedEventEntity';
import { TransactionEntity } from '../../../src/db/entities/TransactionEntity';
import migrations from '../../../src/db/migrations';
import { PaymentTransaction } from '../../../src/models/Models';
import { dbAction, DatabaseAction } from '../../../src/db/DatabaseAction';
import Utils from '../../../src/helpers/Utils';
import { loggerFactory } from '../../../src/log/Logger';
import TestUtils from '../../../tests/testUtils/TestUtils';
import { EventTrigger } from '@rosen-chains/abstract-chain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = loggerFactory(import.meta.url);

class DatabaseActionMock {
  static testDataSource = new DataSource({
    type: 'sqlite',
    database: __dirname + '/../../sqlite/test/db.sqlite',
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
      ...migrations.sqlite,
    ],
    synchronize: false,
    logging: false,
  });
  static testDatabase: DatabaseAction;

  /**
   * initializes test database
   */
  static initDatabase = async () => {
    try {
      await this.testDataSource.initialize();
      await this.testDataSource.runMigrations();
      logger.info('Test Data Source has been initialized!');
    } catch (err) {
      logger.error(`An error occurred while initializing test datasource`);
      logger.error(err.stack);
    }
    this.testDatabase = new DatabaseAction(this.testDataSource);

    // mock all database functions to call test database function
    vi.spyOn(dbAction, 'setEventStatus').mockImplementation(
      this.testDatabase.setEventStatus
    );
    vi.spyOn(dbAction, 'getEventById').mockImplementation(
      this.testDatabase.getEventById
    );
    vi.spyOn(dbAction, 'getEventsByStatuses').mockImplementation(
      this.testDatabase.getEventsByStatuses
    );
    vi.spyOn(dbAction, 'getWaitingEvents').mockImplementation(
      this.testDatabase.getWaitingEvents
    );
    vi.spyOn(dbAction, 'getActiveTransactions').mockImplementation(
      this.testDatabase.getActiveTransactions
    );
    vi.spyOn(dbAction, 'setTxStatus').mockImplementation(
      this.testDatabase.setTxStatus
    );
    vi.spyOn(dbAction, 'updateTxLastCheck').mockImplementation(
      this.testDatabase.updateTxLastCheck
    );
    vi.spyOn(dbAction, 'setEventStatusToPending').mockImplementation(
      this.testDatabase.setEventStatusToPending
    );
    vi.spyOn(dbAction, 'getTxById').mockImplementation(
      this.testDatabase.getTxById
    );
    vi.spyOn(dbAction, 'updateWithSignedTx').mockImplementation(
      this.testDatabase.updateWithSignedTx
    );
    vi.spyOn(dbAction, 'getEventTxsByType').mockImplementation(
      this.testDatabase.getEventTxsByType
    );
    vi.spyOn(dbAction, 'replaceTx').mockImplementation(
      this.testDatabase.replaceTx
    );
    vi.spyOn(dbAction, 'getValidCommitments').mockImplementation(
      this.testDatabase.getValidCommitments
    );
    vi.spyOn(dbAction, 'getUnconfirmedEvents').mockImplementation(
      this.testDatabase.getUnconfirmedEvents
    );
    vi.spyOn(dbAction, 'insertConfirmedEvent').mockImplementation(
      this.testDatabase.insertConfirmedEvent
    );
    vi.spyOn(
      dbAction,
      'getNonCompleteColdStorageTxsInChain'
    ).mockImplementation(this.testDatabase.getNonCompleteColdStorageTxsInChain);
    vi.spyOn(dbAction, 'getUnsignedActiveTxsInChain').mockImplementation(
      this.testDatabase.getUnsignedActiveTxsInChain
    );
    vi.spyOn(dbAction, 'getSignedActiveTxsInChain').mockImplementation(
      this.testDatabase.getSignedActiveTxsInChain
    );
    vi.spyOn(dbAction, 'getEventPaymentTransaction').mockImplementation(
      this.testDatabase.getEventPaymentTransaction
    );
  };

  /**
   * deletes every record in Event and Transaction table in ScannerDatabase
   */
  static clearTables = async () => {
    await this.testDatabase.CommitmentRepository.createQueryBuilder()
      .delete()
      .execute();
    await this.testDatabase.TransactionRepository.createQueryBuilder()
      .delete()
      .execute();
    await this.testDatabase.ConfirmedEventRepository.createQueryBuilder()
      .delete()
      .execute();
    await this.testDatabase.EventRepository.createQueryBuilder()
      .delete()
      .execute();
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
  static insertEventRecord = async (
    event: EventTrigger,
    status: string,
    boxSerialized = 'boxSerialized',
    sourceChainHeight = 300,
    firstTry?: string,
    eventHeight = 200,
    spendHeight?: number
  ) => {
    await this.testDatabase.EventRepository.createQueryBuilder()
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
        spendHeight: spendHeight,
      })
      .execute();
    const eventData =
      await this.testDatabase.EventRepository.createQueryBuilder()
        .select()
        .where('sourceTxId = :id', { id: event.sourceTxId })
        .getOne();
    await this.testDatabase.ConfirmedEventRepository.createQueryBuilder()
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
   * @param spendHeight
   */
  static insertOnlyEventDataRecord = async (
    event: EventTrigger,
    boxSerialized = 'boxSerialized',
    spendHeight?: number
  ) => {
    const height = 300;
    await this.testDatabase.EventRepository.createQueryBuilder()
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
        sourceChainHeight: event.sourceChainHeight,
        spendHeight: spendHeight,
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
  static insertTxRecord = async (
    paymentTx: PaymentTransaction,
    type: string,
    chain: string,
    status: string,
    lastCheck: number,
    eventId: string,
    lastStatusUpdate?: string
  ) => {
    const event = await this.testDatabase.ConfirmedEventRepository.findOneBy({
      id: eventId,
    });
    await this.testDatabase.TransactionRepository.insert({
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
   * @param wid
   * @param height
   */
  static insertCommitmentBoxRecord = async (
    eventId: string,
    boxSerialized: string,
    wid: string,
    height: number
  ) => {
    await this.testDatabase.CommitmentRepository.createQueryBuilder()
      .insert()
      .values({
        extractor: 'extractor',
        eventId: eventId,
        commitment: 'commitment',
        WID: wid,
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
  static allRawEventRecords = async () => {
    return await this.testDatabase.EventRepository.createQueryBuilder()
      .select()
      .getMany();
  };

  /**
   * returns all records in Event table in ScannerDatabase
   */
  static allEventRecords = async () => {
    return await this.testDatabase.ConfirmedEventRepository.createQueryBuilder()
      .select()
      .getMany();
  };

  /**
   * returns all records in Transaction table in ScannerDatabase
   */
  static allTxRecords = async () => {
    return await this.testDatabase.TransactionRepository.find({
      relations: ['event'],
    });
  };
}

export default DatabaseActionMock;
