import {
  And,
  DataSource,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { ConfirmedEventEntity } from './entities/ConfirmedEventEntity';
import { TransactionEntity } from './entities/TransactionEntity';
import {
  EventStatus,
  RevenuePeriod,
  TransactionStatus,
} from '../utils/constants';
import {
  CommitmentEntity,
  EventTriggerEntity,
} from '@rosen-bridge/watcher-data-extractor';
import Utils from '../utils/Utils';
import { loggerFactory } from '../log/Logger';
import { Semaphore } from 'await-semaphore';
import { SortRequest } from '../types/api';
import { RevenueEntity } from './entities/revenueEntity';
import { RevenueView } from './entities/revenueView';
import { RevenueChartView } from './entities/revenueChartView';
import {
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

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
    await this.ConfirmedEventRepository.update(
      { id: eventId },
      { status: status }
    );
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
    await this.TransactionRepository.update(
      { txId: txId },
      {
        status: status,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
      }
    );
  };

  /**
   * updates tx info when failed in sign process
   * @param txId the transaction id
   */
  setTxAsSignFailed = async (txId: string): Promise<void> => {
    await this.TransactionRepository.update(
      {
        txId: txId,
        status: TransactionStatus.inSign,
      },
      {
        status: TransactionStatus.signFailed,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
        signFailedCount: () => '"signFailedCount" + 1',
        failedInSign: true,
      }
    );
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
    await this.TransactionRepository.update(
      { txId: txId },
      { lastCheck: currentHeight }
    );
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
    await this.ConfirmedEventRepository.update(
      { id: eventId },
      { status: status, firstTry: String(Math.round(Date.now() / 1000)) }
    );
  };

  /**
   * @param txId the transaction id
   * @return the transaction
   */
  getTxById = async (txId: string): Promise<TransactionEntity | null> => {
    return await this.TransactionRepository.findOne({
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
    await this.TransactionRepository.update(
      { txId: txId },
      {
        txJson: txJson,
        status: TransactionStatus.signed,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
        lastCheck: currentHeight,
      }
    );
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
        event: {
          ...event,
          eventData: {
            ...event.eventData,
            spendBlock: event.eventData.spendBlock
              ? event.eventData.spendBlock
              : IsNull(),
          },
        },
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
    tx: PaymentTransaction
  ): Promise<void> => {
    await this.TransactionRepository.update(
      { txId: previousTxId },
      {
        txId: tx.txId,
        txJson: tx.toJson(),
        type: tx.txType,
        chain: tx.network,
        status: TransactionStatus.approved,
        lastStatusUpdate: String(Math.round(Date.now() / 1000)),
        lastCheck: 0,
        failedInSign: false,
      }
    );
  };

  /**
   * updates failedInSign field of a transaction to false
   * @param txId
   */
  resetFailedInSign = async (txId: string): Promise<void> => {
    await this.TransactionRepository.update(
      { txId: txId },
      {
        failedInSign: false,
      }
    );
  };

  /**
   * inserts a tx record into transactions table
   */
  insertNewTx = async (
    paymentTx: PaymentTransaction,
    event: ConfirmedEventEntity | null
  ): Promise<void> => {
    await this.TransactionRepository.insert({
      txId: paymentTx.txId,
      txJson: paymentTx.toJson(),
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
    await this.ConfirmedEventRepository.insert({
      id: Utils.txIdToEventId(eventData.sourceTxId),
      eventData: eventData,
      status: EventStatus.pendingPayment,
      firstTry: String(Math.round(Date.now() / 1000)),
    });
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
        type: TransactionType.coldStorage,
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
          event: {
            ...event,
            eventData: {
              ...event.eventData,
              spendBlock: event.eventData.spendBlock
                ? event.eventData.spendBlock
                : IsNull(),
            },
          },
          status: TransactionStatus.completed,
          type: TransactionType.payment,
        },
      ],
    });
    if (txs.length === 0)
      throw new Error(`No payment tx found for event [${eventId}]`);
    else if (txs.length > 1)
      throw new ImpossibleBehavior(
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
      .where('confirmed_event.status = :status', {
        status: EventStatus.completed,
      });
    if (fromChain)
      query.andWhere('event_trigger_entity_fromChain = :fromChain', {
        fromChain,
      });
    if (toChain)
      query.andWhere('event_trigger_entity_toChain = :toChain', {
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
      event_trigger_entity_height: sort || SortRequest.DESC,
    });
    return query.getMany();
  };

  /**
   * selects completed events with the specified condition
   * @param sort
   * @param fromChain
   * @param toChain
   * @param minAmount
   * @param maxAmount
   * @returns returns completed events with the specified condition
   */
  getOngoingEvents = async (
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
      .where('confirmed_event.status not in (:completedStatus, :spentStatus)', {
        completedStatus: EventStatus.completed,
        spentStatus: EventStatus.spent,
      });
    if (fromChain)
      query.andWhere('event_trigger_entity_fromChain = :fromChain', {
        fromChain,
      });
    if (toChain)
      query.andWhere('event_trigger_entity_toChain = :toChain', {
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
      event_trigger_entity_height: sort || SortRequest.DESC,
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
      .where('tx.type = :type', { type: TransactionType.reward })
      .andWhere('tx.status = :status', { status: TransactionStatus.completed })
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
    return this.TransactionRepository.findBy({
      txId: In(txIds),
    });
  };

  /**
   * Stores the info of permit in chart entity
   * @param tokenId
   * @param amount
   * @param permit
   */
  storeRevenue = async (
    tokenId: string,
    amount: bigint,
    tx: TransactionEntity
  ) => {
    return await this.RevenueRepository.insert({
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
    const clauses = [],
      heightCondition = [],
      timeCondition = [];
    if (fromChain) clauses.push({ fromChain: fromChain });
    if (toChain) clauses.push({ toChain: toChain });
    if (tokenId) clauses.push({ revenueTokenId: tokenId });
    if (minHeight) heightCondition.push(MoreThanOrEqual(minHeight));
    if (maxHeight) heightCondition.push(LessThan(maxHeight));
    if (heightCondition.length > 0)
      clauses.push({ height: And(...heightCondition) });
    if (fromBlockTime) timeCondition.push(MoreThanOrEqual(fromBlockTime));
    if (toBlockTime) timeCondition.push(LessThan(toBlockTime));
    if (timeCondition.length > 0)
      clauses.push({ timestamp: And(...timeCondition) });
    return this.RevenueView.find({
      where:
        clauses.length > 0
          ? clauses.reduce(
              (partialCondition, clause) => ({
                ...partialCondition,
                ...clause,
              }),
              {}
            )
          : undefined,
      order: {
        timestamp: sort ? sort : 'DESC',
      },
    });
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
    } else if (period === RevenuePeriod.week) {
      query.addGroupBy('week_number');
    }
    return query.getRawMany();
  };
}

export { DatabaseAction };
