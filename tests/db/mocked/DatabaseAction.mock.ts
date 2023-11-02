import '../../../src/bootstrap';
import { DataSource } from 'typeorm';
import {
  BlockEntity,
  PROCEED,
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
import Utils from '../../../src/utils/Utils';
import TestUtils from '../../testUtils/TestUtils';
import { EventTrigger, PaymentTransaction } from '@rosen-chains/abstract-chain';
import { DatabaseAction } from '../../../src/db/DatabaseAction';
import { RevenueEntity } from '../../../src/db/entities/revenueEntity';
import { RevenueChartView } from '../../../src/db/entities/revenueChartView';
import { RevenueView } from '../../../src/db/entities/revenueView';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

class DatabaseActionMock {
  static testDataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [
      BlockEntity,
      CommitmentEntity,
      ConfirmedEventEntity,
      EventTriggerEntity,
      TransactionEntity,
      RevenueEntity,
      RevenueView,
      RevenueChartView,
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
    DatabaseAction.init(this.testDataSource);
    this.testDatabase = DatabaseAction.getInstance();
  };

  /**
   * deletes every record in Event and Transaction table in ScannerDatabase
   */
  static clearTables = async () => {
    await this.testDatabase.RevenueRepository.clear();
    await this.testDatabase.CommitmentRepository.clear();
    await this.testDatabase.TransactionRepository.clear();
    await this.testDatabase.ConfirmedEventRepository.clear();
    await this.testDatabase.EventRepository.clear();
    await this.testDataSource.getRepository(BlockEntity).clear();
  };

  /**
   * inserts a record to Event and ConfirmedEvent tables in db
   * @param event
   * @param status
   * @param boxSerialized
   * @param sourceChainHeight
   * @param firstTry
   * @param eventHeight
   * @param spendHeight
   * @param spendBlockId
   * @param spendTxId
   */
  static insertEventRecord = async (
    event: EventTrigger,
    status: string,
    boxSerialized = 'boxSerialized',
    sourceChainHeight = 300,
    firstTry?: string,
    eventHeight = 200,
    spendHeight?: number,
    spendBlockId = 'blockId',
    spendTxId?: string
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
        spendBlock: spendBlockId,
        spendTxId: spendTxId,
        txId: 'event-creation-tx-id',
        eventId: Utils.txIdToEventId(event.sourceTxId),
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
    spendHeight?: number,
    spendTxId?: string,
    spendBlock?: string
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
        spendTxId: spendTxId,
        spendBlock: spendBlock,
        WIDs: event.WIDs.join(','),
        txId: 'event-creation-tx-id',
      })
      .execute();
  };

  /**
   * inserts a record to Event table in ScannerDatabase
   * @param paymentTx
   * @param status
   * @param lastCheck
   * @param lastStatusUpdate
   * @param failedInSign
   * @param signFailedCount
   */
  static insertTxRecord = async (
    paymentTx: PaymentTransaction,
    status: string,
    lastCheck = 0,
    lastStatusUpdate?: string,
    failedInSign = false,
    signFailedCount = 0
  ) => {
    const event = await this.testDatabase.ConfirmedEventRepository.findOneBy({
      id: paymentTx.eventId,
    });
    await this.testDatabase.TransactionRepository.insert({
      txId: paymentTx.txId,
      txJson: paymentTx.toJson(),
      type: paymentTx.txType,
      chain: paymentTx.network,
      status: status,
      lastCheck: lastCheck,
      event: event!,
      lastStatusUpdate: lastStatusUpdate,
      failedInSign: failedInSign,
      signFailedCount: signFailedCount,
    });
  };

  /**
   * inserts a record to Event table in
   * @param eventId
   * @param boxSerialized
   * @param wid
   * @param height
   * @param rwtCount
   */
  static insertCommitmentBoxRecord = async (
    eventId: string,
    boxSerialized: string,
    wid: string,
    height: number,
    rwtCount: string
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
        rwtCount: rwtCount,
        txId: 'txId',
      })
      .execute();
  };

  /**
   * Inserts a block record
   * @param timestamp
   * @param height
   */
  static insertBlockRecord = async (
    timestamp = 1680000000,
    hash = TestUtils.generateRandomId(),
    height = 1000
  ) => {
    const date = new Date(timestamp);
    await this.testDataSource
      .getRepository(BlockEntity)
      .createQueryBuilder()
      .insert()
      .values({
        height: height,
        hash: hash,
        parentHash: TestUtils.generateRandomId(),
        status: PROCEED,
        scanner: 'scanner',
        timestamp: timestamp,
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDay(),
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

  /**
   * returns all records in Revenue table
   */
  static allRevenueRecords = async () => {
    return await this.testDatabase.RevenueRepository.find({
      relations: ['eventData'],
    });
  };
}

export default DatabaseActionMock;
