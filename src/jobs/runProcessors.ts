import EventProcessor from '../guard/event/EventProcessor';
import { txAgreement } from '../guard/agreement/TxAgreement';
import Configs from '../helpers/Configs';
import TransactionProcessor from '../guard/TransactionProcessor';
import GuardTurn from '../helpers/GuardTurn';
import ColdStorage from '../guard/coldStorage/ColdStorage';
import ColdStorageConfig from '../guard/coldStorage/ColdStorageConfig';

/**
 * resends generated tx for an event
 */
const resendTxJob = () => {
  if (GuardTurn.secondsToReset() < GuardTurn.UP_TIME_LENGTH) {
    txAgreement.resendTransactionRequests();
    setTimeout(resendTxJob, Configs.txResendInterval * 1000);
  }
};

/**
 * runs EventProcessor job to process confirmed events
 */
const confirmedEventsJob = () => {
  // process confirmed events
  EventProcessor.processConfirmedEvents().then(() => {
    setTimeout(confirmedEventsJob, GuardTurn.secondsToNextTurn() * 1000);
    setTimeout(resendTxJob, Configs.txResendInterval * 1000);
  });
  // clear generated transactions when turn is over
  setTimeout(txAgreement.clearTransactions, GuardTurn.UP_TIME_LENGTH * 1000);
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
const resetJob = () => {
  txAgreement
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
const coldStorageJob = () => {
  if (ColdStorageConfig.isWithinTime()) {
    // process lock address assets for sending any to cold storage
    ColdStorage.processLockAddressAssets().then(() => {
      setTimeout(coldStorageJob, GuardTurn.secondsToNextTurn() * 1000);
    });
    // clear generated transactions when turn is over
    setTimeout(txAgreement.clearTransactions, GuardTurn.UP_TIME_LENGTH * 1000);
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
