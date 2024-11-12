import EventProcessor from '../event/EventProcessor';
import Configs from '../configs/Configs';
import TransactionProcessor from '../transaction/TransactionProcessor';
import GuardTurn from '../utils/GuardTurn';
import ColdStorage from '../coldStorage/ColdStorage';
import ColdStorageConfig from '../coldStorage/ColdStorageConfig';
import TxAgreement from '../agreement/TxAgreement';
import ArbitraryProcessor from '../arbitrary/ArbitraryProcessor';
import EventSynchronization from '../synchronization/EventSynchronization';
import DetectionHandler from '../handlers/DetectionHandler';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * sends generated tx to agreement
 */
const agreementQueueJob = async () => {
  if (GuardTurn.secondsToReset() < GuardTurn.UP_TIME_LENGTH) {
    const txAgreement = await TxAgreement.getInstance();
    txAgreement.processAgreementQueue().then(() => {
      setTimeout(agreementQueueJob, Configs.agreementQueueInterval * 1000);
    });
  }
};

/**
 * resends agreement process messages
 */
const agreementResendJob = async () => {
  if (GuardTurn.secondsToReset() < GuardTurn.UP_TIME_LENGTH) {
    const txAgreement = await TxAgreement.getInstance();
    txAgreement.resendTransactionRequests();
    setTimeout(
      txAgreement.resendApprovalMessages,
      Configs.approvalResendDelay * 1000
    );
    setTimeout(agreementResendJob, Configs.txResendInterval * 1000);
  }
};

const roundJob = async () => {
  // enqueue sign failed txs after 30 seconds in turn
  setTimeout((await TxAgreement.getInstance()).enqueueSignFailedTxs, 30 * 1000);
  // run TxAgreement queue and resend jobs
  setTimeout(agreementQueueJob, Configs.agreementQueueInterval * 1000);
  setTimeout(agreementResendJob, Configs.txResendInterval * 1000);
  // clear generated transactions when turn is over
  setTimeout(
    (await TxAgreement.getInstance()).clearTransactions,
    GuardTurn.UP_TIME_LENGTH * 1000
  );
  // TODO: There are some concerns about sequential execution of Tx Generation jobs
  //  local:ergo/rosen-bridge/guard-service#317
  // process confirmed events
  await EventProcessor.processConfirmedEvents();
  // process arbitrary orders
  await ArbitraryProcessor.getInstance().processArbitraryOrders();
  // process lock address assets for sending any to cold storage
  if (ColdStorageConfig.isWithinTime()) {
    await ColdStorage.processLockAddressAssets();
  }

  // reschedule the job
  setTimeout(roundJob, GuardTurn.secondsToNextTurn() * 1000);
};

/**
 * runs EventProcessor job to process scanned events
 */
const scannedEventsJob = () => {
  EventProcessor.processScannedEvents().then(() =>
    setTimeout(scannedEventsJob, Configs.scannedEventProcessorInterval * 1000)
  );
};

/**
 * runs cleanUp job for txAgreement
 */
const resetJob = async () => {
  (await TxAgreement.getInstance())
    .clearAgreedTransactions()
    .then(() => setTimeout(resetJob, GuardTurn.secondsToReset() * 1000));
};

/**
 * runs TransactionProcessor job
 */
const transactionJob = () => {
  TransactionProcessor.processTransactions().then(() =>
    setTimeout(transactionJob, Configs.txProcessorInterval * 1000)
  );
};

/**
 * runs timeout leftover events, orders and event active syncs job
 */
const timeoutProcessorJob = async () => {
  await EventProcessor.TimeoutLeftoverEvents();
  await ArbitraryProcessor.getInstance().timeoutLeftoverOrders();
  await EventSynchronization.getInstance().timeoutActiveSyncs();
  setTimeout(timeoutProcessorJob, Configs.timeoutProcessorInterval * 1000);
};

/**
 * runs requeue waiting events and orders job
 */
const requeueWaitingEventsJob = async () => {
  await EventProcessor.RequeueWaitingEvents();
  await ArbitraryProcessor.getInstance().requeueWaitingOrders();
  setTimeout(
    requeueWaitingEventsJob,
    Configs.requeueWaitingEventsInterval * 1000
  );
};

/**
 * runs event active synchronizations jobs
 */
const eventSyncJob = async () => {
  await EventSynchronization.getInstance().processSyncQueue();
  await EventSynchronization.getInstance().sendSyncBatch();
  setTimeout(eventSyncJob, Configs.eventSyncInterval * 1000);
};

/**
 * runs Detection update job
 */
const detectionUpdateJob = () => {
  DetectionHandler.getInstance()
    .update()
    .then(() =>
      setTimeout(detectionUpdateJob, Configs.detectionUpdateInterval * 1000)
    )
    .catch((e) => {
      logger.error(`Detection update job failed with error: ${e}`);
      setTimeout(detectionUpdateJob, Configs.detectionUpdateInterval * 1000);
    });
};

/**
 * runs all processors and their related jobs
 */
const runProcessors = () => {
  setTimeout(scannedEventsJob, Configs.scannedEventProcessorInterval * 1000);
  setTimeout(roundJob, GuardTurn.secondsToNextTurn() * 1000);
  setTimeout(resetJob, GuardTurn.secondsToReset() * 1000);
  setTimeout(transactionJob, Configs.txProcessorInterval * 1000);
  setTimeout(timeoutProcessorJob, Configs.timeoutProcessorInterval * 1000);
  setTimeout(
    requeueWaitingEventsJob,
    Configs.requeueWaitingEventsInterval * 1000
  );
  setTimeout(eventSyncJob, Configs.eventSyncInterval * 1000);
  setTimeout(detectionUpdateJob, Configs.detectionUpdateInterval * 1000);
};

export { runProcessors };
