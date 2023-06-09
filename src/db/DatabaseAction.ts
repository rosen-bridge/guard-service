import { DataSource, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { ConfirmedEventEntity } from './entities/ConfirmedEventEntity';
import { dataSource } from '../../config/dataSource';
import { TransactionEntity } from './entities/TransactionEntity';
import {
  EventStatus,
  TransactionStatus,
  TransactionTypes,
} from '../models/Models';
import {
  CommitmentEntity,
  EventTriggerEntity,
} from '@rosen-bridge/watcher-data-extractor';
import Utils from '../helpers/Utils';
import { loggerFactory } from '../log/Logger';
import { Semaphore } from 'await-semaphore/index';
import { ImpossibleBehavior, NotFoundError } from '../helpers/errors';
import * as RosenChains from '@rosen-chains/abstract-chain';
import TransactionSerializer from '../transaction/TransactionSerializer';

const logger = loggerFactory(import.meta.url);

class DatabaseAction {
  dataSource: DataSource;
  CommitmentRepository: Repository<CommitmentEntity>;
  EventRepository: Repository<EventTriggerEntity>;
  ConfirmedEventRepository: Repository<ConfirmedEventEntity>;
  TransactionRepository: Repository<TransactionEntity>;

  txSignSemaphore = new Semaphore(1);

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.CommitmentRepository = this.dataSource.getRepository(CommitmentEntity);
    this.EventRepository = this.dataSource.getRepository(EventTriggerEntity);
    this.ConfirmedEventRepository =
      this.dataSource.getRepository(ConfirmedEventEntity);
    this.TransactionRepository =
      this.dataSource.getRepository(TransactionEntity);
  }

  /**
   * updates the status of an event by id
   *  NOTE: this method does NOT update firstTry column
   * @param eventId the event trigger id
   * @param status the event trigger status
   */
  setEventStatus = async (eventId: string, status: string): Promise<void> => {
    await this.ConfirmedEventRepository.createQueryBuilder()
      .update()
      .set({
        status: status,
      })
      .where('id = :id', { id: eventId })
      .execute();
  };

  /**
   * @param eventId the event trigger id
   * @return the event trigger
   */
  getEventById = async (
    eventId: string
  ): Promise<ConfirmedEventEntity | null> => {
    return await this.ConfirmedEventRepository.findOne({
      relations: ['eventData'],
      where: {
        id: eventId,
      },
    });
  };

  /**
   * @param statuses list of statuses
   * @return the event triggers with status
   */
  getEventsByStatuses = async (
    statuses: string[]
  ): Promise<ConfirmedEventEntity[]> => {
    return await this.ConfirmedEventRepository.find({
      relations: ['eventData'],
      where: statuses.map((eventStatus) => ({
        status: eventStatus,
      })),
    });
  };

  /**
   * @return the event triggers with waiting status
   */
  getWaitingEvents = async (): Promise<ConfirmedEventEntity[]> => {
    return await this.ConfirmedEventRepository.find({
      relations: ['eventData'],
      where: [
        {
          status: EventStatus.paymentWaiting,
        },
        {
          status: EventStatus.rewardWaiting,
        },
      ],
    });
  };

  /**
   * @return incomplete the transaction
   */
  getActiveTransactions = async (): Promise<TransactionEntity[]> => {
    return await this.TransactionRepository.find({
      relations: ['event'],
      where: {
        status: In([
          TransactionStatus.sent,
          TransactionStatus.signed,
          TransactionStatus.approved,
          TransactionStatus.signFailed,
          TransactionStatus.inSign,
        ]),
      },
    });
  };

  /**
   * updates the status of a tx with its id
   * @param txId the transaction id
   * @param status tx status
   */
  setTxStatus = async (txId: string, status: string): Promise<void> => {
    await this.TransactionRepository.createQueryBuilder()
      .update()
      .set({
        status: status,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
      })
      .where('txId = :id', { id: txId })
      .execute();
  };

  /**
   * updates the status of a tx with its id
   * @param txId the transaction id
   * @param currentHeight current height of the blockchain
   */
  updateTxLastCheck = async (
    txId: string,
    currentHeight: number
  ): Promise<void> => {
    await this.TransactionRepository.createQueryBuilder()
      .update()
      .set({
        lastCheck: currentHeight,
      })
      .where('txId = :id', { id: txId })
      .execute();
  };

  /**
   * updates the status of an event and sets firstTry columns with current timestamp
   * @param eventId the event trigger id
   * @param status status of the process
   */
  setEventStatusToPending = async (
    eventId: string,
    status: string
  ): Promise<void> => {
    await this.ConfirmedEventRepository.createQueryBuilder()
      .update()
      .set({
        status: status,
        firstTry: String(Math.round(Date.now() / 1000)),
      })
      .where('id = :id', { id: eventId })
      .execute();
  };

  /**
   * @param txId the transaction id
   * @return the transaction
   */
  getTxById = async (txId: string): Promise<TransactionEntity> => {
    return await this.TransactionRepository.findOneOrFail({
      relations: ['event'],
      where: {
        txId: txId,
      },
    });
  };

  /**
   * updates the tx and set status as signed
   * @param txId the transaction id
   * @param txJson tx json
   * @param currentHeight current height of the blockchain
   */
  updateWithSignedTx = async (
    txId: string,
    txJson: string,
    currentHeight: number
  ): Promise<void> => {
    await this.TransactionRepository.createQueryBuilder()
      .update()
      .set({
        txJson: txJson,
        status: TransactionStatus.signed,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
        lastCheck: currentHeight,
      })
      .where('txId = :id', { id: txId })
      .execute();
  };

  /**
   * inserts a new approved tx into Transaction table (if already another approved tx exists, keeps the one with loser txId)
   * @param newTx the transaction
   */
  insertTx = async (newTx: RosenChains.PaymentTransaction): Promise<void> => {
    const event = await this.getEventById(newTx.eventId);
    if (event === null && newTx.txType !== TransactionTypes.coldStorage) {
      throw new Error(`Event [${newTx.eventId}] not found`);
    }

    const txs = await this.getEventValidTxsByType(event!.id, newTx.txType);
    if (txs.length > 1) {
      throw new ImpossibleBehavior(
        `Event [${newTx.eventId}] has already more than 1 (${txs.length}) active ${newTx.txType} tx`
      );
    } else if (txs.length === 1) {
      const tx = txs[0];
      if (tx.status === TransactionStatus.approved) {
        if (newTx.txId < tx.txId) {
          logger.info(
            `Replacing tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`
          );
          await this.replaceTx(tx.txId, newTx);
        } else if (newTx.txId === tx.txId) {
          logger.info(`Ignoring tx [${tx.txId}], already exists in database`);
        } else
          logger.info(
            `Ignoring new tx [${newTx.txId}] due to higher txId, comparing to [${tx.txId}]`
          );
      } else
        logger.warn(
          `Received approval for newTx [${newTx.txId}] where its event [${
            event!.id
          }] has already a completed oldTx [${tx.txId}]`
        );
    } else await this.insertNewTx(newTx, event!);
  };

  /**
   * returns all valid transaction for corresponding event
   * @param eventId the event trigger id
   * @param type the transaction type
   */
  getEventValidTxsByType = async (
    eventId: string,
    type: string
  ): Promise<TransactionEntity[]> => {
    const event = await this.getEventById(eventId);
    if (event === null) throw Error(`Event [${eventId}] not found`);
    return await this.TransactionRepository.find({
      relations: ['event'],
      where: {
        event: event,
        type: type,
        status: Not(TransactionStatus.invalid),
      },
    });
  };

  /**
   * replaces a transaction with a new one
   * @param previousTxId the previous transaction id
   * @param tx the new transaction
   */
  replaceTx = async (
    previousTxId: string,
    tx: RosenChains.PaymentTransaction
  ): Promise<void> => {
    await this.TransactionRepository.createQueryBuilder()
      .update()
      .set({
        txId: tx.txId,
        txJson: TransactionSerializer.toJson(tx),
        type: tx.txType,
        chain: tx.network,
        status: TransactionStatus.approved,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
        lastCheck: 0,
      })
      .where('txId = :id', { id: previousTxId })
      .execute();
  };

  /**
   * inserts a tx record into transactions table
   */
  private insertNewTx = async (
    paymentTx: RosenChains.PaymentTransaction,
    event: ConfirmedEventEntity
  ): Promise<void> => {
    await this.TransactionRepository.insert({
      txId: paymentTx.txId,
      txJson: TransactionSerializer.toJson(paymentTx),
      type: paymentTx.txType,
      chain: paymentTx.network,
      status: TransactionStatus.approved,
      lastStatusUpdate: String(Math.round(Date.now() / 1000)),
      lastCheck: 0,
      event: event !== null ? event : undefined,
    });
  };

  /**
   * @param eventId the event trigger id
   * @param eventBoxHeight the event trigger box mined height
   * @return commitments that created before event trigger and didn't spent yet
   */
  getValidCommitments = async (
    eventId: string,
    eventBoxHeight: number
  ): Promise<CommitmentEntity[]> => {
    return await this.CommitmentRepository.find({
      where: {
        eventId: eventId,
        height: LessThan(eventBoxHeight),
        spendBlock: IsNull(),
      },
    });
  };

  /**
   * @return all event triggers with no spent height
   */
  getUnconfirmedEvents = async (): Promise<EventTriggerEntity[]> => {
    // TODO: join table with confirmedEvents and get only unconfirmed ones (#204)
    return await this.EventRepository.find();
  };

  /**
   * inserts a confirmed event into table
   * @param eventData
   */
  insertConfirmedEvent = async (
    eventData: EventTriggerEntity
  ): Promise<void> => {
    await this.ConfirmedEventRepository.createQueryBuilder()
      .insert()
      .values({
        id: Utils.txIdToEventId(eventData.sourceTxId),
        eventData: eventData,
        status: EventStatus.pendingPayment,
        firstTry: String(Math.round(Date.now() / 1000)),
      })
      .execute();
  };

  /**
   * returns all transaction for cold storage
   * @param chain the chain of the tx
   */
  getNonCompleteColdStorageTxsInChain = async (
    chain: string
  ): Promise<TransactionEntity[]> => {
    return await this.TransactionRepository.find({
      relations: ['event'],
      where: {
        type: TransactionTypes.coldStorage,
        status: Not(TransactionStatus.completed),
        chain: chain,
      },
    });
  };

  /**
   * returns all unsigned transactions for a chain (with status approved, in-sign or sign-failed)
   * @param chain the chain of the tx
   */
  getUnsignedActiveTxsInChain = async (
    chain: string
  ): Promise<TransactionEntity[]> => {
    return await this.TransactionRepository.find({
      relations: ['event'],
      where: [
        {
          status: TransactionStatus.approved,
          chain: chain,
        },
        {
          status: TransactionStatus.inSign,
          chain: chain,
        },
        {
          status: TransactionStatus.signFailed,
          chain: chain,
        },
      ],
    });
  };

  /**
   * returns all signed transactions for a chain (with status signed or sent)
   * @param chain the chain of the tx
   */
  getSignedActiveTxsInChain = async (
    chain: string
  ): Promise<TransactionEntity[]> => {
    return await this.TransactionRepository.find({
      relations: ['event'],
      where: [
        {
          status: TransactionStatus.signed,
          chain: chain,
        },
        {
          status: TransactionStatus.sent,
          chain: chain,
        },
      ],
    });
  };

  /**
   * returns the payment transaction for an event
   * @param eventId
   */
  getEventPaymentTransaction = async (
    eventId: string
  ): Promise<TransactionEntity> => {
    const event = await this.getEventById(eventId);
    if (event === null) throw new NotFoundError(`Event [${eventId}] not found`);
    const txs = await this.TransactionRepository.find({
      relations: ['event'],
      where: [
        {
          event: event,
          status: TransactionStatus.completed,
          type: TransactionTypes.payment,
        },
      ],
    });
    if (txs.length === 0)
      throw new NotFoundError(`No payment tx found for event [${eventId}]`);
    else if (txs.length > 1)
      throw new ImpossibleBehavior(
        `Found more than one completed payment transaction for event [${eventId}]`
      );
    else return txs[0];
  };
}

const dbAction = new DatabaseAction(dataSource);

export { DatabaseAction, dbAction };
