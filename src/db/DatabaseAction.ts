import { DataSource, In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { ConfirmedEventEntity } from './entities/ConfirmedEventEntity';
import { dataSource } from './dataSource';
import { TransactionEntity } from './entities/TransactionEntity';
import {
  EventStatus,
  RevenuePeriod,
  TransactionStatus,
  TransactionTypes,
} from '../utils/constants';
import {
  CommitmentEntity,
  EventTriggerEntity,
} from '@rosen-bridge/watcher-data-extractor';
import Utils from '../utils/Utils';
import { loggerFactory } from '../log/Logger';
import { Semaphore } from 'await-semaphore/index';
import * as RosenChains from '@rosen-chains/abstract-chain';
import TransactionSerializer from '../transaction/TransactionSerializer';
import { SortRequest } from '../types/api';
import { RevenueEntity } from './entities/revenueEntity';
import { RevenueView } from './entities/revenueView';
import { RevenueChartView } from './entities/revenueChartView';

const logger = loggerFactory(import.meta.url);

class DatabaseAction {
  private static instance: DatabaseAction;
  dataSource: DataSource;
  CommitmentRepository: Repository<CommitmentEntity>;
  EventRepository: Repository<EventTriggerEntity>;
  ConfirmedEventRepository: Repository<ConfirmedEventEntity>;
  TransactionRepository: Repository<TransactionEntity>;
  RevenueRepository: Repository<RevenueEntity>;
  RevenueView: Repository<RevenueView>;
  RevenueChartView: Repository<RevenueChartView>;

  txSignSemaphore = new Semaphore(1);

  /**
   * initiates data source
   * @param dataSource
   */
  init = (dataSource: DataSource) => {
    this.dataSource = dataSource;
    this.CommitmentRepository = this.dataSource.getRepository(CommitmentEntity);
    this.EventRepository = this.dataSource.getRepository(EventTriggerEntity);
    this.ConfirmedEventRepository =
      this.dataSource.getRepository(ConfirmedEventEntity);
    this.TransactionRepository =
      this.dataSource.getRepository(TransactionEntity);
    this.RevenueRepository = this.dataSource.getRepository(RevenueEntity);
    this.RevenueView = dataSource.getRepository(RevenueView);
    this.RevenueChartView = dataSource.getRepository(RevenueChartView);
  };

  /**
   * generates a DatabaseAction object if it doesn't exist
   * @returns DatabaseAction instance
   */
  static getInstance = () => {
    if (!DatabaseAction.instance) {
      logger.debug("DatabaseAction instance didn't exist. Creating a new one");
      DatabaseAction.instance = new DatabaseAction();
    }
    return DatabaseAction.instance;
  };

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
        failedInSign: false,
      })
      .where('txId = :id', { id: previousTxId })
      .execute();
  };

  /**
   * updates failedInSign field of a transaction to false
   * @param txId
   */
  resetFailedInSign = async (txId: string): Promise<void> => {
    await this.TransactionRepository.createQueryBuilder()
      .update()
      .set({
        failedInSign: false,
      })
      .where('txId = :id', { id: txId })
      .execute();
  };

  /**
   * inserts a tx record into transactions table
   */
  insertNewTx = async (
    paymentTx: RosenChains.PaymentTransaction,
    event: ConfirmedEventEntity | null
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
      failedInSign: false,
      signFailedCount: 0,
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
    if (event === null) throw new Error(`Event [${eventId}] not found`);
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
      throw new Error(`No payment tx found for event [${eventId}]`);
    else if (txs.length > 1)
      throw new RosenChains.ImpossibleBehavior(
        `Found more than one completed payment transaction for event [${eventId}]`
      );
    else return txs[0];
  };

  /**
   * returns all unsigned transactions which failed in sign process
   */
  getUnsignedFailedSignTxs = async (): Promise<TransactionEntity[]> => {
    return await this.TransactionRepository.find({
      relations: ['event'],
      where: [
        {
          status: TransactionStatus.signFailed,
          failedInSign: true,
        },
        {
          status: TransactionStatus.inSign,
          failedInSign: true,
        },
      ],
    });
  };

  /**
   * selects completed events with the specified condition
   * @param limit
   * @param offset
   * @param sort
   * @param fromChain
   * @param toChain
   * @param minAmount
   * @param maxAmount
   * @returns returns completed events with the specified condition
   */
  getCompletedEvents = async (
    sort: SortRequest | undefined,
    fromChain: string | undefined,
    toChain: string | undefined,
    minAmount: string | undefined,
    maxAmount: string | undefined
  ) => {
    const query = this.ConfirmedEventRepository.createQueryBuilder(
      'confirmed_event'
    )
      .leftJoinAndSelect('confirmed_event.eventData', 'event_trigger_entity')
      .where('confirmed_event.status == "completed"');
    if (fromChain)
      query.andWhere('event_trigger_entity_fromChain == :fromChain', {
        fromChain,
      });
    if (toChain)
      query.andWhere('event_trigger_entity_toChain == :toChain', {
        toChain,
      });
    if (minAmount)
      query.andWhere(
        'CAST(event_trigger_entity_amount AS LONG) >= :minAmount',
        {
          minAmount,
        }
      );
    if (maxAmount)
      query.andWhere(
        'CAST(event_trigger_entity_amount AS LONG) <= :maxAmount',
        {
          maxAmount,
        }
      );
    query.orderBy({
      event_trigger_entity_height: sort ? sort : SortRequest.DESC,
    });
    return query.getMany();
  };

  /*
   * Returns unsaved revenue transaction ids
   */
  getUnsavedRevenueIds = async (): Promise<Array<string>> => {
    const unsavedTxs = await this.TransactionRepository.createQueryBuilder('tx')
      .select('tx.txId', 'txId')
      .leftJoin('revenue_entity', 're', 'tx.txId = re.txId')
      .where('tx.type == :type', { type: TransactionTypes.reward })
      .andWhere('tx.status == "completed"')
      .andWhere('re.txId IS NULL')
      .getRawMany();

    const unsavedTxIds = unsavedTxs.map((tx: { txId: string }) => tx.txId);
    return unsavedTxIds;
  };

  /**
   * Returns transactions with specified txIds
   * @param txIds
   */
  getTxsById = async (txIds: string[]): Promise<TransactionEntity[]> => {
    return this.TransactionRepository.createQueryBuilder()
      .where('txId IN (:...txIds)', { txIds })
      .getMany();
  };

  /**
   * Stores the info of permit in chart entity
   * @param tokenId
   * @param amount
   * @param permit
   */
  storeRevenue = async (
    tokenId: string,
    amount: string,
    tx: TransactionEntity
  ) => {
    return await this.RevenueRepository.save({
      tokenId,
      amount,
      tx,
    });
  };

  /**
   * Returns all revenue with respect to the filters
   * @param fromChain
   * @param toChain
   * @param tokenId
   * @param sourceTxId
   * @param minHeight
   * @param maxHeight
   * @param fromBlockTime
   * @param toBlockTime
   * @param sorting
   * @param offset
   * @param limit
   */
  getRevenuesWithFilters = async (
    sort?: SortRequest,
    fromChain?: string,
    toChain?: string,
    tokenId?: string,
    minHeight?: number,
    maxHeight?: number,
    fromBlockTime?: number,
    toBlockTime?: number
  ): Promise<RevenueView[]> => {
    const query = this.RevenueView.createQueryBuilder().select('*');

    if (fromChain) {
      query.andWhere('fromChain = :fromChain', { fromChain });
    }
    if (toChain) {
      query.andWhere('toChain = :toChain', { toChain });
    }
    if (tokenId) {
      query.andWhere('revenueTokenId = :tokenId', { tokenId });
    }
    if (minHeight) {
      query.andWhere('height >= :minHeight', { minHeight });
    }
    if (maxHeight) {
      query.andWhere('height <= :maxHeight', { maxHeight });
    }
    if (fromBlockTime) {
      query.andWhere('timestamp >= :fromBlockTime', { fromBlockTime });
    }
    if (toBlockTime) {
      query.andWhere('timestamp <= :toBlockTime', { toBlockTime });
    }
    query.orderBy('timestamp', sort ? sort : 'DESC');

    return query.getRawMany();
  };

  /**
   * Returns chart data with the specified period
   * @param period
   * @param offset
   * @param limit
   */
  getRevenueChartData = async (period: RevenuePeriod) => {
    const query = this.RevenueChartView.createQueryBuilder();
    query
      .select('"tokenId"')
      .addSelect('SUM(amount)', 'amount')
      .addSelect('MIN(timestamp)', 'label')
      .groupBy('"tokenId"')
      .orderBy('timestamp', 'DESC');
    if (period === RevenuePeriod.year) {
      query.addGroupBy('year');
    } else if (period === RevenuePeriod.month) {
      query.addGroupBy('year').addGroupBy('month');
    } else if (period === RevenuePeriod.weak) {
      query.addGroupBy('weak_number');
    }
    return query.getRawMany();
  };
}

export { DatabaseAction };
