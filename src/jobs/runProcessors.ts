import EventProcessor from '../event/EventProcessor';
import Configs from '../configs/Configs';
import TransactionProcessor from '../transaction/TransactionProcessor';
import GuardTurn from '../utils/GuardTurn';
import ColdStorage from '../coldStorage/ColdStorage';
import ColdStorageConfig from '../coldStorage/ColdStorageConfig';
import TxAgreement from '../agreement/TxAgreement';

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

/**
 * runs EventProcessor job to process confirmed events
 */
const confirmedEventsJob = async () => {
  // process confirmed events
  EventProcessor.processConfirmedEvents().then(() => {
    setTimeout(confirmedEventsJob, GuardTurn.secondsToNextTurn() * 1000);
  });
  (await TxAgreement.getInstance()).enqueueSignFailedTxs();
  setTimeout(agreementQueueJob, Configs.agreementQueueInterval * 1000);
  setTimeout(agreementResendJob, Configs.txResendInterval * 1000);
  // clear generated transactions when turn is over
  setTimeout(
    (await TxAgreement.getInstance()).clearTransactions,
    GuardTurn.UP_TIME_LENGTH * 1000
  );
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
 * runs TimeoutLeftoverEvents job
 */
const timeoutProcessorJob = () => {
  EventProcessor.TimeoutLeftoverEvents().then(() =>
    setTimeout(timeoutProcessorJob, Configs.timeoutProcessorInterval * 1000)
  );
};

/**
 * runs RequeueWaitingEvents job
 */
const requeueWaitingEventsJob = () => {
  EventProcessor.RequeueWaitingEvents().then(() =>
    setTimeout(
      requeueWaitingEventsJob,
      Configs.requeueWaitingEventsInterval * 1000
    )
  );
};

/**
 * runs coldStorage jobs
 */
const coldStorageJob = async () => {
  if (ColdStorageConfig.isWithinTime()) {
    // process lock address assets for sending any to cold storage
    ColdStorage.processLockAddressAssets().then(() => {
      setTimeout(coldStorageJob, GuardTurn.secondsToNextTurn() * 1000);
    });
    // clear generated transactions when turn is over
    setTimeout(
      (await TxAgreement.getInstance()).clearTransactions,
      GuardTurn.UP_TIME_LENGTH * 1000
    );
  } else setTimeout(coldStorageJob, GuardTurn.secondsToNextTurn() * 1000);
};

/**
 * runs all processors and their related jobs
 */
const runProcessors = () => {
  scannedEventsJob();
  setTimeout(confirmedEventsJob, GuardTurn.secondsToNextTurn() * 1000);
  setTimeout(coldStorageJob, GuardTurn.secondsToNextTurn() * 1000);
  setTimeout(resetJob, GuardTurn.secondsToReset() * 1000);
  transactionJob();
  setTimeout(timeoutProcessorJob, Configs.timeoutProcessorInterval * 1000);
  setTimeout(
    requeueWaitingEventsJob,
    Configs.requeueWaitingEventsInterval * 1000
  );
};

export { runProcessors };
