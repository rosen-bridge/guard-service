import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../utils/constants';
import {
  CandidateTransaction,
  TransactionRequest,
  GuardResponse,
  TransactionApproved,
  ApprovedCandidate,
  AgreementMessageTypes,
} from './Interfaces';
import Dialer from '../communication/Dialer';
import {
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import RequestVerifier from '../verification/RequestVerifier';
import * as TransactionSerializer from '../transaction/TransactionSerializer';
import Configs from '../configs/Configs';
import GuardTurn from '../utils/GuardTurn';
import TransactionVerifier from '../verification/TransactionVerifier';
import DatabaseHandler from '../db/DatabaseHandler';
import GuardPkHandler from '../handlers/GuardPkHandler';
import { DatabaseAction } from '../db/DatabaseAction';
import { Communicator } from '@rosen-bridge/communication';
import { ECDSA } from '@rosen-bridge/encryption';
import { Semaphore } from 'await-semaphore';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class TxAgreement extends Communicator {
  private static instance: TxAgreement;
  protected static CHANNEL = 'tx-agreement';
  protected static dialer: Dialer;
  protected transactionQueue: PaymentTransaction[];
  protected transactions: Map<string, CandidateTransaction>;
  protected eventAgreedTransactions: Map<string, string>; // eventId -> txId
  protected orderAgreedTransactions: Map<string, string>; // orderId -> txId
  protected agreedColdStorageTransactions: Map<string, string>; // chainName -> txId
  protected transactionApprovals: Map<string, string[]>; // txId -> signatures
  protected approvedTransactions: ApprovedCandidate[];
  protected approvalSemaphore: Semaphore;

  protected constructor() {
    super(
      logger,
      new ECDSA(Configs.guardSecret),
      TxAgreement.sendMessageWrapper,
      GuardPkHandler.getInstance().publicKeys,
      GuardTurn.UP_TIME_LENGTH
    );
    this.transactionQueue = [];
    this.transactions = new Map();
    this.eventAgreedTransactions = new Map();
    this.agreedColdStorageTransactions = new Map();
    this.orderAgreedTransactions = new Map();
    this.transactionApprovals = new Map();
    this.approvedTransactions = [];
    this.approvalSemaphore = new Semaphore(1);
  }

  /**
   * wraps communicator send message to dialer
   * @param msg
   * @param peers
   */
  static sendMessageWrapper = async (msg: string, peers: Array<string>) => {
    if (peers.length === 0) {
      TxAgreement.dialer.sendMessage(TxAgreement.CHANNEL, msg);
    } else {
      for (const peerId of peers) {
        TxAgreement.dialer.sendMessage(TxAgreement.CHANNEL, msg, peerId);
      }
    }
  };

  /**
   * wraps dialer handle message to communicator
   * @param msg
   * @param channel
   * @param peerId
   */
  messageHandlerWrapper = async (
    msg: string,
    channel: string,
    peerId: string
  ) => {
    this.handleMessage(msg, peerId);
  };

  /**
   * generates a TxAgreement object if it doesn't exist
   * @returns TxAgreement instance
   */
  public static getInstance = async () => {
    if (!TxAgreement.instance) {
      logger.debug("TxAgreement instance didn't exist. Creating a new one");
      TxAgreement.instance = new TxAgreement();
      this.dialer = await Dialer.getInstance();
      this.dialer.subscribeChannel(
        TxAgreement.CHANNEL,
        TxAgreement.instance.messageHandlerWrapper
      );
    }
    return TxAgreement.instance;
  };

  /**
   * adds a transaction to agreement queue
   * @param tx
   */
  addTransactionToQueue = (tx: PaymentTransaction): void => {
    this.transactionQueue.push(tx);
  };

  /**
   * adds all unsigned transactions which failed in sign process to agreement queue
   */
  enqueueSignFailedTxs = async (): Promise<void> => {
    const txs = await DatabaseAction.getInstance().getUnsignedFailedSignTxs();
    txs
      .filter((tx) => tx.type !== TransactionType.manual)
      .forEach((tx) =>
        this.transactionQueue.push(TransactionSerializer.fromJson(tx.txJson))
      );
  };

  /**
   * starts agreement process for created PaymentTransactions in queue
   */
  processAgreementQueue = async (): Promise<void> => {
    let tx: PaymentTransaction;
    while (this.transactionQueue.length > 0) {
      tx = this.transactionQueue.pop()!;
      try {
        const timestamp = Math.round(Date.now() / 1000);

        // broadcast the transaction
        await this.broadcastTransactionRequest(tx, timestamp);
        const signature = await this.signCandidateMessage(tx.txId, timestamp);

        const approvals = Array(this.guardPks.length).fill('');
        approvals[this.index] = signature;
        this.transactions.set(tx.txId, { tx, timestamp });
        this.transactionApprovals.set(tx.txId, approvals);
        logger.info(`Started agreement process for tx [${tx.txId}]`);
      } catch (e) {
        logger.warn(
          `An error occurred while starting agreement process for tx [${tx.txId}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
  };

  /**
   * sends request to all other guards to agree on a transaction
   * @param tx the created PaymentTransaction
   * @param timestamp
   */
  protected broadcastTransactionRequest = async (
    tx: PaymentTransaction,
    timestamp: number
  ): Promise<void> => {
    const candidatePayload: TransactionRequest = {
      txJson: tx.toJson(),
    };

    // broadcast the transaction
    await this.sendMessage(
      AgreementMessageTypes.request,
      candidatePayload,
      [],
      timestamp
    );
  };

  /**
   * handles received message from tx-agreement channel
   * @param type
   * @param payload
   * @param signature
   * @param senderIndex
   * @param peerId
   * @param timestamp
   */
  processMessage = async (
    type: string,
    payload: unknown,
    signature: string,
    senderIndex: number,
    peerId: string,
    timestamp: number
  ): Promise<void> => {
    try {
      switch (type) {
        case AgreementMessageTypes.request: {
          const candidate = payload as TransactionRequest;
          const tx = TransactionSerializer.fromJson(candidate.txJson);
          await this.processTransactionRequest(
            tx,
            senderIndex,
            timestamp,
            peerId
          );
          break;
        }
        case AgreementMessageTypes.response: {
          const response = payload as GuardResponse;
          await this.processAgreementResponse(
            response.txId,
            senderIndex,
            signature,
            timestamp
          );
          break;
        }
        case AgreementMessageTypes.approval: {
          const approval = payload as TransactionApproved;
          const tx = TransactionSerializer.fromJson(approval.txJson);
          await this.processApprovalMessage(
            tx,
            senderIndex,
            approval.signatures,
            timestamp,
            peerId
          );
          break;
        }
        default:
          logger.warn(
            `Received unexpected message type [${type}] in tx-agreement channel`
          );
      }
    } catch (e) {
      logger.warn(
        `An error occurred while handling tx-agreement message: ${e}}`
      );
      logger.warn(e.stack);
    }
  };

  /**
   * verifies the transaction sent by other guards
   * sends response if conditions are met
   * otherwise does nothing
   * @param tx the created payment transaction
   * @param creatorId id of the guard that created the transaction
   * @param timestamp
   * @param receiver the guard who will receive this response
   */
  protected processTransactionRequest = async (
    tx: PaymentTransaction,
    creatorId: number,
    timestamp: number,
    receiver: string
  ): Promise<void> => {
    // verify transaction
    if (!(await this.verifyTransactionRequest(tx, creatorId))) return;

    // agree to transaction
    this.transactions.set(tx.txId, { tx, timestamp });
    const agreementPayload: GuardResponse = { txId: tx.txId };

    // send response to creator guard
    await this.sendMessage(
      AgreementMessageTypes.response,
      agreementPayload,
      [receiver],
      timestamp
    );
  };

  /**
   * verifies the transaction sent by other guards
   * @param tx
   * @param creatorId creator guard index
   * @returns true if transaction verified
   */
  protected verifyTransactionRequest = async (
    tx: PaymentTransaction,
    creatorId: number
  ): Promise<boolean> => {
    // verify general conditions
    const guardTurn = GuardTurn.guardTurn();
    if (guardTurn !== creatorId) {
      logger.warn(
        `Received tx [${tx.txId}] from sender [${creatorId}] but it's not sender's turn [${guardTurn} != ${creatorId}]`
      );
      return false;
    }
    if (!(await TransactionVerifier.verifyTxCommonConditions(tx))) {
      logger.warn(
        `Received tx [${tx.txId}] but tx common conditions hasn't verified`
      );
      return false;
    }

    // verify unique conditions
    if (
      tx.txType === TransactionType.payment ||
      tx.txType === TransactionType.reward
    ) {
      const eventId = tx.eventId;
      // verify if agreed to other txs
      if (
        this.eventAgreedTransactions.has(eventId) &&
        this.eventAgreedTransactions.get(eventId) !== tx.txId
      ) {
        logger.warn(
          `Received tx [${
            tx.txId
          }] for event [${eventId}] but already agreed to tx [${this.eventAgreedTransactions.get(
            eventId
          )}]`
        );
        return false;
      }
      // verify conditions
      if (!(await RequestVerifier.verifyEventTransactionRequest(tx)))
        return false;

      logger.info(`Agreed with tx [${tx.txId}] for event [${eventId}]`);
      this.eventAgreedTransactions.set(eventId, tx.txId);
    } else if (tx.txType === TransactionType.coldStorage) {
      // verify if agreed to other txs
      if (
        this.agreedColdStorageTransactions.has(tx.network) &&
        this.agreedColdStorageTransactions.get(tx.network) !== tx.txId
      ) {
        logger.warn(
          `Received cold storage tx [${
            tx.txId
          }] but already agreed to tx [${this.agreedColdStorageTransactions.get(
            tx.network
          )}]`
        );
        return false;
      }
      // verify conditions
      if (!(await RequestVerifier.verifyColdStorageTransactionRequest(tx)))
        return false;

      logger.info(`Agreed with cold storage tx [${tx.txId}]`);
      this.agreedColdStorageTransactions.set(tx.network, tx.txId);
    } else if (tx.txType === TransactionType.arbitrary) {
      const orderId = tx.eventId;
      // verify if agreed to other txs
      if (
        this.orderAgreedTransactions.has(orderId) &&
        this.orderAgreedTransactions.get(orderId) !== tx.txId
      ) {
        logger.warn(
          `Received tx [${
            tx.txId
          }] for order [${orderId}] but already agreed to tx [${this.orderAgreedTransactions.get(
            orderId
          )}]`
        );
        return false;
      }
      // verify conditions
      if (!(await RequestVerifier.verifyArbitraryTransactionRequest(tx)))
        return false;

      logger.info(
        `Agreed with tx [${tx.txId}] for arbitrary order [${orderId}]`
      );
      this.orderAgreedTransactions.set(orderId, tx.txId);
    } else {
      logger.info(
        `Received tx [${tx.txId}] but type [${tx.txType}] is not supported`
      );
      return false;
    }

    return true;
  };

  /**
   * verifies the agreement response sent by other guards, save their signature if they agreed
   * @param txId the payment transaction id
   * @param signerIndex index of the guard that sent the response
   * @param signature signature of creator guard over request data
   * @param timestamp
   */
  protected processAgreementResponse = async (
    txId: string,
    signerIndex: number,
    signature: string,
    timestamp: number
  ): Promise<void> => {
    const candidateTx = this.transactions.get(txId);
    if (candidateTx === undefined) return;
    if (candidateTx.timestamp !== timestamp) {
      logger.debug(
        `Received guard [${signerIndex}] agreement for txId [${txId}] but timestamp is wrong [${candidateTx.timestamp} !== ${timestamp}]`
      );
      return;
    }

    logger.info(`Guard [${signerIndex}] Agreed with transaction [${txId}]`);
    const txApprovals = this.transactionApprovals.get(txId);
    if (!txApprovals)
      throw new ImpossibleBehavior(`no approval found for tx [${txId}]`);
    else txApprovals[signerIndex] = signature;

    await this.approvalSemaphore.acquire().then(async (release) => {
      try {
        const txApprovals = this.transactionApprovals.get(txId);
        if (
          txApprovals &&
          txApprovals.filter((signature) => signature !== '').length >=
            GuardPkHandler.getInstance().requiredSign
        ) {
          logger.info(
            `The majority of guards agreed with transaction [${txId}]`
          );

          const approvals = this.transactionApprovals.get(txId)!;
          const approvedTx: ApprovedCandidate = {
            tx: candidateTx.tx,
            signatures: approvals,
            timestamp: timestamp,
          };

          await this.broadcastApprovalMessage(approvedTx);
          if (
            !this.approvedTransactions.find(
              (approvedTx) => approvedTx.tx.txId === txId
            )
          )
            this.approvedTransactions.push(approvedTx);
          await this.setTxAsApproved(candidateTx.tx);
        }
        release();
      } catch (e) {
        release();
        throw e;
      }
    });
  };

  /**
   * sends approval message to all other guards
   * @param approvedCandidate approved candidate transaction
   */
  protected broadcastApprovalMessage = async (
    approvedCandidate: ApprovedCandidate
  ): Promise<void> => {
    const approvalPayload: TransactionApproved = {
      txJson: approvedCandidate.tx.toJson(),
      signatures: approvedCandidate.signatures,
    };

    // broadcast the transaction
    await this.sendMessage(
      AgreementMessageTypes.approval,
      approvalPayload,
      [],
      approvedCandidate.timestamp
    );
  };

  /**
   * verifies approval message sent by other guards, set tx as approved if enough guards agreed with tx
   * @param tx
   * @param senderIndex
   * @param signatures
   * @param timestamp
   * @param sender
   */
  protected processApprovalMessage = async (
    tx: PaymentTransaction,
    senderIndex: number,
    signatures: string[],
    timestamp: number,
    sender: string
  ): Promise<void> => {
    let baseError = `Received approval message for tx [${tx.txId}] from sender [${sender}] `;
    let signs = 0;
    const approvedGuards: number[] = [];
    for (let i = 0; i < signatures.length; i++) {
      if (signatures[i] === '') continue;
      const message = `${JSON.stringify({ txId: tx.txId })}${timestamp}${
        this.guardPks[i]
      }`;
      if (
        !(await this.messageEnc.verify(
          message,
          signatures[i],
          this.guardPks[i]
        ))
      ) {
        logger.warn(baseError + `but guard [${i}] signature doesn't verify`);
        return;
      }
      signs++;
      approvedGuards.push(i);
    }
    const requiredSign = GuardPkHandler.getInstance().requiredSign;
    if (signs < requiredSign) {
      logger.warn(
        baseError +
          `but signs is less than required value [${signs} < ${requiredSign}]`
      );
      return;
    }

    baseError = `Other guards [${approvedGuards}] agreed on tx [${tx.txId}] `;
    const agreedTx = this.transactions.get(tx.txId);
    if (agreedTx) {
      logger.info(`Transaction [${tx.txId}] approved`);
      await this.setTxAsApproved(tx);
    } else {
      const currentAgreedTxId = this.eventAgreedTransactions.get(tx.eventId);
      if (currentAgreedTxId === undefined) {
        if (!(await this.verifyTransactionRequest(tx, senderIndex))) {
          logger.warn(baseError + `but tx doesn't verified`);
          return;
        } else {
          logger.info(`Transaction [${tx.txId}] verified and approved`);
          await this.setTxAsApproved(tx);
        }
      } else if (currentAgreedTxId !== tx.txId) {
        logger.warn(
          baseError +
            `but already agreed to tx [${currentAgreedTxId}] for event [${tx.eventId}]`
        );
        return;
      } else
        throw new ImpossibleBehavior(
          `found tx [${tx.txId}] for event [ ${tx.eventId}] but the tx itself doesn't found`
        );
    }
  };

  /**
   * sets the transaction as approved in db and removes it from memory
   * @param tx
   */
  protected setTxAsApproved = async (tx: PaymentTransaction): Promise<void> => {
    const txRecord = await DatabaseAction.getInstance().getTxById(tx.txId);
    try {
      if (txRecord === null) {
        await DatabaseHandler.insertTx(
          tx,
          GuardPkHandler.getInstance().requiredSign
        );
        await this.updateEventOrOrderOfApprovedTx(tx);
      } else {
        if (txRecord.status === TransactionStatus.invalid) {
          logger.debug(
            `Tx [${tx.txId}] is already in database and invalid. Reinsertion is skipped`
          );
        } else {
          logger.debug(
            `Tx [${tx.txId}] is already in database. Only reinserting tx...`
          );
          await DatabaseHandler.insertTx(
            tx,
            GuardPkHandler.getInstance().requiredSign
          );
        }
      }
      this.transactions.delete(tx.txId);
      this.transactionApprovals.delete(tx.txId);
      if (this.eventAgreedTransactions.has(tx.eventId))
        this.eventAgreedTransactions.delete(tx.eventId);
      if (this.agreedColdStorageTransactions.has(tx.network))
        this.agreedColdStorageTransactions.delete(tx.network);
    } catch (e) {
      logger.warn(
        `An error occurred while setting tx [${tx.txId}] as approved: ${e}`
      );
      logger.warn(e.stack);
    }
  };

  /**
   * updates event or order status for a tx
   * @param tx
   */
  protected updateEventOrOrderOfApprovedTx = async (
    tx: PaymentTransaction
  ): Promise<void> => {
    try {
      if (tx.txType === TransactionType.payment)
        await DatabaseAction.getInstance().setEventStatus(
          tx.eventId,
          EventStatus.inPayment
        );
      else if (tx.txType === TransactionType.reward)
        await DatabaseAction.getInstance().setEventStatus(
          tx.eventId,
          EventStatus.inReward
        );
      else if (tx.txType === TransactionType.arbitrary)
        await DatabaseAction.getInstance().setOrderStatus(
          tx.eventId,
          OrderStatus.inProcess
        );
    } catch (e) {
      logger.warn(
        `An error occurred while setting database ${
          tx.txType === TransactionType.arbitrary ? 'order' : 'event'
        } [${tx.eventId}] status: ${e}`
      );
      logger.warn(e.stack);
    }
  };

  /**
   * signs an agreement message
   * @param txId
   * @param timestamp
   */
  protected signCandidateMessage = async (
    txId: string,
    timestamp: number
  ): Promise<string> => {
    return await this.messageEnc.sign(
      `${JSON.stringify({ txId })}${timestamp}${this.guardPks[this.index]}`
    );
  };

  /**
   * iterates over active transactions and resend their requests
   */
  resendTransactionRequests = async (): Promise<void> => {
    logger.info(
      `Resending [${this.transactions.size}] generated transactions for agreement`
    );
    for (const candidateTx of this.transactions.values()) {
      try {
        await this.broadcastTransactionRequest(
          candidateTx.tx,
          candidateTx.timestamp
        );
      } catch (e) {
        logger.warn(
          `An error occurred while resending tx [${candidateTx.tx.txId}]: ${e}`
        );
        logger.warn(e.stack);
      }
    }
  };

  /**
   * iterates over approved transactions and resend their approval messages
   */
  resendApprovalMessages = async (): Promise<void> => {
    logger.info(
      `Resending approval messages for [${this.approvedTransactions.length}] transactions`
    );
    for (const approved of this.approvedTransactions) {
      try {
        await this.broadcastApprovalMessage(approved);
      } catch (e) {
        logger.warn(
          `An error occurred while resending approval message for tx [${approved.tx.txId}]: ${e.stack}`
        );
      }
    }
  };

  /**
   * clears all pending for agreement and approved txs in memory
   */
  clearTransactions = (): void => {
    logger.info(
      `Removing [${this.transactionQueue.length}] generated transactions from agreement queue and [${this.transactionApprovals.size}] from memory`
    );
    this.transactionQueue = [];
    this.transactions.clear();
    this.transactionApprovals.clear();
    this.approvedTransactions = [];
  };

  /**
   * clears all pending for approval txs in memory and db
   */
  clearAgreedTransactions = async (): Promise<void> => {
    logger.info(
      `Removing [${
        this.eventAgreedTransactions.size +
        this.agreedColdStorageTransactions.size
      }] agreed transactions from memory`
    );
    this.transactions.clear();
    this.eventAgreedTransactions.clear();
    this.agreedColdStorageTransactions.clear();
  };

  /**
   * returns list of pending transactions of a chain
   * @param chain
   */
  getChainPendingTransactions = (chain: string): PaymentTransaction[] => {
    const inProgressTxs = Array.from(this.transactions.values()).filter(
      (candidateTx) => candidateTx.tx.network === chain
    );
    const inQueueTxs = Array.from(this.transactionQueue.values()).filter(
      (paymentTx) => paymentTx.network === chain
    );
    return [
      ...inProgressTxs.map((candidateTx) => candidateTx.tx),
      ...inQueueTxs,
    ];
  };
}

export default TxAgreement;
