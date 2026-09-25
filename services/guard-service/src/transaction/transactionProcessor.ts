import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractChain,
  ConfirmationStatus,
  ImpossibleBehavior,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { SigningStatus } from '@rosen-chains/abstract-chain';
import { DOGE_CHAIN } from '@rosen-chains/doge';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

import Configs from '../configs/configs';
import GuardsDogeConfigs from '../configs/guardsDogeConfigs';
import { DatabaseAction } from '../db/databaseAction';
import { TransactionEntity } from '../db/entities/transactionEntity';
import { ZcashSigningAttemptStore } from '../db/zcashSigningAttemptStore';
import EventSerializer from '../event/eventSerializer';
import ChainHandler from '../handlers/chainHandler';
import GuardPkHandler from '../handlers/guardPkHandler';
import { NotificationHandler } from '../handlers/notificationHandler';
import PublicStatusHandler from '../handlers/publicStatusHandler';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../utils/constants';
import * as TransactionSerializer from './transactionSerializer';
import { ZcashBroadcastCoordinator } from './zcashBroadcastCoordinator';
import { ZcashRewardEligibility } from './zcashRewardEligibility';
import { ZcashSigningCoordinator } from './zcashSigningCoordinator';

const logger = DefaultLogger.getInstance().child(import.meta.url);

class TransactionProcessor {
  private static loadRetainedTransaction = async (
    txId: string,
  ): Promise<TransactionEntity> => {
    const retained = await DatabaseAction.getInstance().getTxById(txId);
    if (!retained) throw Error(`Transaction [${txId}] is not retained`);
    return retained;
  };

  private static assertSameDispatchIdentity = (
    expected: TransactionEntity,
    current: TransactionEntity,
  ): void => {
    if (
      current.txId !== expected.txId ||
      current.txJson !== expected.txJson ||
      current.chain !== expected.chain ||
      current.type !== expected.type ||
      current.requiredSign !== expected.requiredSign ||
      current.approvalEvidence !== expected.approvalEvidence ||
      current.signingAttemptId !== expected.signingAttemptId ||
      current.event?.id !== expected.event?.id ||
      current.order?.id !== expected.order?.id
    )
      throw Error(`Transaction [${expected.txId}] dispatch custody changed`);
  };

  /**
   * Reloads the exact retained transaction and, for a Zcash-linked reward,
   * revalidates its settled payment authority immediately before dispatch.
   */
  private static prepareGenericDispatch = async (
    expected: TransactionEntity,
    expectedStatus: string,
  ): Promise<{
    row: TransactionEntity;
    paymentTx: PaymentTransaction;
    assertPolicyCurrent?: () => void;
  }> => {
    const dbAction = DatabaseAction.getInstance();
    let retained = await this.loadRetainedTransaction(expected.txId);
    this.assertSameDispatchIdentity(expected, retained);
    if (retained.status !== expectedStatus)
      throw Error(`Transaction [${retained.txId}] dispatch phase changed`);
    let paymentTx = TransactionSerializer.fromJson(
      retained.txJson,
      ChainHandler.getInstance().getChain,
    );
    if (
      paymentTx.network !== retained.chain ||
      paymentTx.txId !== retained.txId ||
      paymentTx.txType !== retained.type ||
      (retained.event && paymentTx.eventId !== retained.event.id)
    )
      throw Error(`Transaction [${retained.txId}] has invalid identity`);
    const eventId = retained.event?.id ?? paymentTx.eventId;
    const confirmed = await dbAction.getEventById(eventId);
    const targetChain = confirmed?.eventData?.toChain ?? '';
    if (
      !(await ZcashRewardEligibility.isRequired(
        dbAction.dataSource,
        eventId,
        targetChain,
      ))
    )
      return { row: retained, paymentTx };

    if (
      retained.chain !== ERGO_CHAIN ||
      retained.type !== TransactionType.reward ||
      !retained.event ||
      retained.event.id !== eventId ||
      !confirmed?.eventData ||
      confirmed.id !== eventId
    )
      throw Error(`Zcash-linked reward [${retained.txId}] has invalid custody`);
    const event = EventSerializer.fromConfirmedEntity(confirmed);
    if (EventSerializer.getId(event) !== eventId)
      throw Error(`Zcash-linked reward [${retained.txId}] has invalid event`);
    const authorization = await new ZcashRewardEligibility(
      dbAction.dataSource,
      ChainHandler.getInstance().getZcashBroadcastCapability(),
    ).capture(event, confirmed.eventData.txId);

    retained = await this.loadRetainedTransaction(expected.txId);
    this.assertSameDispatchIdentity(expected, retained);
    if (retained.status !== expectedStatus)
      throw Error(`Transaction [${retained.txId}] dispatch phase changed`);
    paymentTx = TransactionSerializer.fromJson(
      retained.txJson,
      ChainHandler.getInstance().getChain,
    );
    if (
      paymentTx.network !== retained.chain ||
      paymentTx.txId !== retained.txId ||
      paymentTx.txType !== retained.type ||
      paymentTx.eventId !== retained.event?.id
    )
      throw Error(`Zcash-linked reward [${retained.txId}] changed identity`);
    await authorization.assertCurrent();
    authorization.assertPolicyCurrent();
    retained = await this.loadRetainedTransaction(expected.txId);
    this.assertSameDispatchIdentity(expected, retained);
    if (retained.status !== expectedStatus)
      throw Error(`Transaction [${retained.txId}] dispatch phase changed`);
    paymentTx = TransactionSerializer.fromJson(
      retained.txJson,
      ChainHandler.getInstance().getChain,
    );
    return {
      row: retained,
      paymentTx,
      assertPolicyCurrent: authorization.assertPolicyCurrent,
    };
  };

  /**
   * processes all active transactions in the database
   */
  static processTransactions = async (): Promise<void> => {
    logger.info(`Processing transactions`);
    const txs = await DatabaseAction.getInstance().getActiveTransactions();
    for (const tx of txs) {
      logger.info(
        `Processing transaction [${tx.txId}] with status [${tx.status}]`,
      );
      try {
        switch (tx.status) {
          case TransactionStatus.approved: {
            await this.processApprovedTx(tx);
            break;
          }
          case TransactionStatus.inSign: {
            await this.processInSignTx(tx);
            break;
          }
          case TransactionStatus.signFailed: {
            await this.processSignFailedTx(tx);
            break;
          }
          case TransactionStatus.signed: {
            await this.processSignedTx(tx);
            break;
          }
          case TransactionStatus.sent: {
            await this.processSentTx(tx);
            break;
          }
        }
      } catch (e) {
        logger.warn(`An error occurred while processing tx [${tx.txId}]: ${e}`);
        logger.warn(e.stack);
      }
    }
    logger.info(`Processed [${txs.length}] transactions`);
  };

  /**
   * sends request to sign tx
   * @param tx transaction record
   */
  static processApprovedTx = async (tx: TransactionEntity): Promise<void> => {
    const dbAction = DatabaseAction.getInstance();
    await dbAction.txSignSemaphore.acquire().then(async (release) => {
      try {
        const retained = await this.loadRetainedTransaction(tx.txId);
        if (
          ![TransactionStatus.approved, TransactionStatus.signFailed].includes(
            retained.status,
          )
        )
          throw Error(
            `Transaction [${retained.txId}] is not ready for signing`,
          );
        if (retained.chain === 'zcash') {
          const coordinator = new ZcashSigningCoordinator(
            dbAction.dataSource,
            ChainHandler.getInstance().getZcashSigningCapability(),
            () => {
              const current = GuardPkHandler.getInstance();
              return {
                protocolVersion: '1.0.0',
                guardPublicKeys: [...current.publicKeys],
                requiredSign: current.requiredSign,
              };
            },
            Configs.guardSecretEcdsa,
          );
          const attempt = await coordinator.start(retained);
          PublicStatusHandler.getInstance().updatePublicTxStatus(
            retained.txId,
            TransactionStatus.inSign,
          );
          void attempt.completion
            .then(() => {
              PublicStatusHandler.getInstance().updatePublicTxStatus(
                retained.txId,
                TransactionStatus.signed,
              );
            })
            .catch((error: unknown) => {
              logger.warn(
                `Zcash attempt [${attempt.attemptId}] stopped; durable state retained: ${String(error)}`,
              );
            });
          release();
          return;
        }
        const chain = ChainHandler.getInstance().getChain(retained.chain);
        await dbAction.setTxStatus(retained.txId, TransactionStatus.inSign);
        const dispatch = await this.prepareGenericDispatch(
          retained,
          TransactionStatus.inSign,
        );
        dispatch.assertPolicyCurrent?.();
        chain
          .signTransaction(dispatch.paymentTx, dispatch.row.requiredSign)
          .then(this.handleSuccessfulSign)
          .catch(async (e) => await this.handleFailedSign(retained.txId, e));
        logger.info(`Tx [${retained.txId}] got sent to the signer`);
        release();
      } catch (e) {
        logger.warn(
          `Unexpected error occurred while sending tx [${tx.txId}] to sign: ${e}`,
        );
        logger.warn(e.stack);
        release();
      }
    });
  };

  /**
   * updates database tx to signed tx
   * @param tx
   */
  static handleSuccessfulSign = async (
    tx: PaymentTransaction,
  ): Promise<void> => {
    if (tx.network === 'zcash')
      throw Error('Zcash signed outcomes require an attempt-bound completion');
    logger.info(`Tx [${tx.txId}] is signed successfully`);
    const currentHeight = await ChainHandler.getInstance()
      .getChain(tx.network)
      .getHeight();
    await DatabaseAction.getInstance().updateWithSignedTx(
      tx.txId,
      tx.toJson(),
      currentHeight,
    );
  };

  /**
   * updates tx status to sign-failed
   * @param tx
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static handleFailedSign = async (txId: string, e: any): Promise<void> => {
    logger.warn(`An error occurred while signing tx [${txId}]: ${e}`);
    await DatabaseAction.getInstance().setTxAsSignFailed(txId);
  };

  /**
   * sets tx as sign-failed if enough time past from the request to sign
   * @param tx transaction record
   */
  static processInSignTx = async (tx: TransactionEntity): Promise<void> => {
    if (tx.chain === 'zcash') {
      const attempt = await new ZcashSigningAttemptStore(
        DatabaseAction.getInstance().dataSource,
      ).getActive(tx.txId);
      if (!attempt || attempt.attemptId !== tx.signingAttemptId)
        throw Error('Zcash in-sign row has no matching durable attempt');
      logger.info(
        `Zcash attempt [${attempt.attemptId}] remains [${attempt.state}]; queue absence cannot authorize retry`,
      );
      return;
    }
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    const paymentTx = TransactionSerializer.fromJson(
      tx.txJson,
      ChainHandler.getInstance().getChain,
    );
    if (await chain.isTransactionInSign(paymentTx)) {
      logger.info(`Signer is still signing tx [${tx.txId}]`);
    } else {
      logger.warn(
        `Signer does not have tx [${tx.txId}]. Updating status to sign-failed`,
      );
      await DatabaseAction.getInstance().setTxAsSignFailed(tx.txId);
    }
  };

  /**
   * revalidates tx, request to sign again if it's still valid, otherwise sets as invalid
   * @param tx transaction record
   */
  static processSignFailedTx = async (tx: TransactionEntity): Promise<void> => {
    if (tx.chain === 'zcash')
      throw Error(
        'Zcash failed signing requires durable outcome reconciliation',
      );
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    // TODO: Remove this if and implement a general way to reduce confirmation check frequency
    // local:ergo/rosen-bridge/guard-service#447
    if (tx.chain === DOGE_CHAIN) {
      // in case of Doge, we only check confirmation of sign-failed txs in 10% of times (configurable with default value of 10)
      if (
        Math.random() >
        GuardsDogeConfigs.signFailedConfirmationCheckPercent / 100
      ) {
        logger.info(
          `Ignored confirmation check for Doge tx [${tx.txId}]. Requesting to sign tx...`,
        );
        await this.processApprovedTx(tx);
        return;
      } else {
        logger.info(`Checking confirmation status for Doge tx [${tx.txId}]...`);
      }
    }
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type as TransactionType,
    );
    if (
      txConfirmation !== ConfirmationStatus.NotFound ||
      (await chain.isTxInMempool(tx.txId))
    ) {
      // tx found in network. set status as sent
      logger.info(
        `Tx [${tx.txId}] found in blockchain. Updating status to 'sent'`,
      );
      await DatabaseAction.getInstance().setTxStatus(
        tx.txId,
        TransactionStatus.sent,
      );
    } else {
      // tx is not found, checking if tx is still valid
      const paymentTx = TransactionSerializer.fromJson(
        tx.txJson,
        ChainHandler.getInstance().getChain,
      );
      const validityStatus = await chain.isTxValid(
        paymentTx,
        SigningStatus.UnSigned,
      );
      if (validityStatus.isValid) {
        // tx is valid, requesting to sign...
        logger.info(`Tx [${tx.txId}] is still valid. Requesting to sign tx...`);
        await this.processApprovedTx(tx);
      } else {
        // tx is invalid, reset status if enough blocks past.
        await this.setTransactionAsInvalid(tx, chain, validityStatus.details);
      }
    }
  };

  /**
   * submits tx to blockchain
   * @param tx transaction record
   */
  static processSignedTx = async (tx: TransactionEntity): Promise<void> => {
    const retained = await this.loadRetainedTransaction(tx.txId);
    if (retained.status !== TransactionStatus.signed)
      throw Error(`Transaction [${retained.txId}] is not ready to submit`);
    if (retained.chain === 'zcash') {
      await this.processZcashBroadcast(retained.txId);
      return;
    }
    const chain = ChainHandler.getInstance().getChain(retained.chain);
    const dispatch = await this.prepareGenericDispatch(
      retained,
      TransactionStatus.signed,
    );
    dispatch.assertPolicyCurrent?.();
    await chain.submitTransaction(dispatch.paymentTx);
    await DatabaseAction.getInstance().setTxStatus(
      retained.txId,
      TransactionStatus.sent,
    );
  };

  /**
   * processes the transaction that has been sent before
   * @param tx transaction record
   */
  static processSentTx = async (tx: TransactionEntity): Promise<void> => {
    tx = await this.loadRetainedTransaction(tx.txId);
    if (tx.status !== TransactionStatus.sent)
      throw Error(`Transaction [${tx.txId}] is not ready to reconcile`);
    if (tx.chain === 'zcash') {
      await this.processZcashBroadcast(tx.txId);
      return;
    }
    const chain = ChainHandler.getInstance().getChain(tx.chain);
    // TODO: Remove this if and implement a general way to reduce confirmation check frequency
    // local:ergo/rosen-bridge/guard-service#447
    if (tx.chain === DOGE_CHAIN) {
      // in case of Doge, we only check confirmation of sign-failed txs in 60% of times (configurable with default value of 60)
      if (
        Math.random() >
        GuardsDogeConfigs.sentConfirmationCheckPercent / 100
      ) {
        logger.info(`Ignored confirmation check for Doge tx [${tx.txId}].`);
        return;
      } else {
        logger.info(`Checking confirmation status for Doge tx [${tx.txId}]...`);
      }
    }
    const txConfirmation = await chain.getTxConfirmationStatus(
      tx.txId,
      tx.type as TransactionType,
    );
    switch (txConfirmation) {
      case ConfirmationStatus.ConfirmedEnough: {
        // tx confirmed enough, proceed to next process
        await DatabaseAction.getInstance().setTxStatus(
          tx.txId,
          TransactionStatus.completed,
        );
        if (tx.type === TransactionType.payment && tx.chain !== ERGO_CHAIN) {
          if (!tx.event)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no event associated with it`,
            );

          // set event status, to start reward distribution
          await DatabaseAction.getInstance().setEventStatusToPending(
            tx.event.id,
            EventStatus.pendingReward,
          );
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${tx.event.id}] is ready for reward distribution`,
          );
        } else if (
          tx.type === TransactionType.reward ||
          (tx.type === TransactionType.payment && tx.chain === ERGO_CHAIN)
        ) {
          if (!tx.event)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no event associated with it`,
            );
          // set event as complete
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.completed,
          );
          logger.info(
            `Tx [${tx.txId}] is confirmed. Event [${tx.event.id}] is complete`,
          );
        } else if (tx.type === TransactionType.arbitrary) {
          if (!tx.order)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no order associated with it`,
            );

          // set order as complete
          await DatabaseAction.getInstance().setOrderStatus(
            tx.order.id,
            OrderStatus.completed,
          );
          logger.info(
            `Tx [${tx.txId}] is confirmed. Order [${tx.order.id}] is complete`,
          );
        } else {
          // no need to do anything about event, just log that tx confirmed
          logger.info(
            `Tx [${tx.txId}] with type [${tx.type}] in chain [${tx.chain}] is confirmed`,
          );
        }
        break;
      }
      case ConfirmationStatus.NotConfirmedEnough: {
        // tx is mined, but not enough confirmation, updating last check...
        const height = await chain.getHeight();
        await DatabaseAction.getInstance().updateTxLastCheck(tx.txId, height);
        logger.info(`Tx [${tx.txId}] is in confirmation process`);
        break;
      }
      case ConfirmationStatus.NotFound: {
        // tx is not mined, checking mempool...
        if (await chain.isTxInMempool(tx.txId)) {
          // tx is in mempool, updating last check...
          const height = await chain.getHeight();
          await DatabaseAction.getInstance().updateTxLastCheck(tx.txId, height);
          logger.info(`Tx [${tx.txId}] is in mempool`);
        } else {
          // tx is not in mempool, checking if tx is still valid
          const paymentTx = TransactionSerializer.fromJson(
            tx.txJson,
            ChainHandler.getInstance().getChain,
          );
          const validityStatus = await chain.isTxValid(
            paymentTx,
            SigningStatus.Signed,
          );
          if (validityStatus.isValid) {
            // tx is valid. resending...
            logger.info(`Tx [${tx.txId}] is still valid. Resending tx...`);
            const dispatch = await this.prepareGenericDispatch(
              tx,
              TransactionStatus.sent,
            );
            dispatch.assertPolicyCurrent?.();
            await chain.submitTransaction(dispatch.paymentTx);
          } else {
            // tx is invalid. reset status if enough blocks past.
            await this.setTransactionAsInvalid(
              tx,
              chain,
              validityStatus.details,
            );
          }
        }
      }
    }
  };

  private static processZcashBroadcast = async (
    txId: string,
  ): Promise<void> => {
    const coordinator = new ZcashBroadcastCoordinator(
      DatabaseAction.getInstance().dataSource,
      ChainHandler.getInstance().getZcashBroadcastCapability(),
      () => {
        const guards = GuardPkHandler.getInstance();
        return {
          protocolVersion: '1.0.0',
          guardPublicKeys: [...guards.publicKeys],
          requiredSign: guards.requiredSign,
        };
      },
      Configs.guardSecretEcdsa,
    );
    const result = await coordinator.process(txId);
    if (result.kind === 'settled') {
      PublicStatusHandler.getInstance().updatePublicTxStatus(
        txId,
        TransactionStatus.completed,
      );
    }
    logger.info(`Zcash transaction [${txId}] result [${result.kind}]`);
  };

  /**
   * resets status of event (if tx is related to any event) and set tx as invalid if enough blocks past from last check
   * @param tx transaction record
   * @param chain AbstractChain object
   * @param invalidationDetails reason of invalidation with unexpectedness status
   */
  static setTransactionAsInvalid = async (
    tx: TransactionEntity,
    chain: AbstractChain<unknown>,
    invalidationDetails:
      | {
          reason: string;
          unexpected: boolean;
        }
      | undefined,
  ): Promise<void> => {
    if (invalidationDetails === undefined)
      throw new ImpossibleBehavior(
        `Tx [${tx.txId}] is invalid but no reason is provided`,
      );
    const height = await chain.getHeight();
    if (
      height - tx.lastCheck >=
      ChainHandler.getInstance()
        .getChain(tx.chain)
        .getTxRequiredConfirmation(tx.type as TransactionType)
    ) {
      await DatabaseAction.getInstance().setTxStatus(
        tx.txId,
        TransactionStatus.invalid,
      );
      if (invalidationDetails.unexpected) {
        // send notification if invalidation reason is unexpected
        await NotificationHandler.getInstance().notify(
          'warning',
          `Tx is invalid`,
          `Tx [${tx.txId}] on chain [${tx.chain}] is invalid due to reason: ${invalidationDetails.reason}`,
        );
      }
      switch (tx.type) {
        case TransactionType.payment:
          if (!tx.event)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no event associated with it`,
            );
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.pendingPayment,
            invalidationDetails.unexpected,
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for payment. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.reward:
          if (!tx.event)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no event associated with it`,
            );
          await DatabaseAction.getInstance().setEventStatus(
            tx.event.id,
            EventStatus.pendingReward,
            invalidationDetails.unexpected,
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Event [${tx.event.id}] is now waiting for reward distribution. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.arbitrary:
          if (!tx.order)
            throw new ImpossibleBehavior(
              `Tx [${tx.txId}] has no order associated with it`,
            );

          await DatabaseAction.getInstance().setOrderStatus(
            tx.order.id,
            OrderStatus.pending,
            false,
            invalidationDetails.unexpected,
          );
          logger.info(
            `Tx [${tx.txId}] is invalid. Order [${tx.order.id}] is now waiting for payment. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.coldStorage:
          logger.info(
            `Cold storage tx [${tx.txId}] is invalid. Reason: ${invalidationDetails.reason}`,
          );
          break;
        case TransactionType.manual:
          logger.warn(
            `Manual tx [${tx.txId}] is invalid. Reason: ${invalidationDetails.reason}`,
          );
          break;
      }
    } else {
      logger.info(
        `Tx [${tx.txId}] is invalid. Waiting for enough confirmation of this proposition. Reason: ${invalidationDetails.reason}`,
      );
    }
  };
}

export default TransactionProcessor;
