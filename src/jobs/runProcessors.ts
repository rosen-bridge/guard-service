import EventProcessor from "../guard/EventProcessor";
import Utils from "../helpers/Utils";
import { txAgreement } from "../guard/agreement/TxAgreement";
import Configs from "../helpers/Configs";
import TransactionProcessor from "../guard/TransactionProcessor";

/**
 * resends generated tx for an event
 */
const resendTxJob = () => {
    if (Utils.secondsToReset() < Utils.UP_TIME_LENGTH) {
        txAgreement.resendTransactionRequests()
        setTimeout(resendTxJob, Configs.txResendInterval * 1000)
    }
}

/**
 * runs EventProcessor job to process confirmed events
 */
const confirmedEventsJob = () => {
    // process confirmed events
    EventProcessor.processConfirmedEvents().then(() => {
        setTimeout(confirmedEventsJob, Utils.secondsToNextTurn() * 1000)
        setTimeout(resendTxJob, Configs.txResendInterval * 1000)
    })
    // clear generated transactions when turn is over
    setTimeout(txAgreement.clearTransactions, Utils.UP_TIME_LENGTH * 1000)
}

/**
 * runs EventProcessor job to process scanned events
 */
const scannedEventsJob = () => {
    EventProcessor.processScannedEvents().then(() => setTimeout(scannedEventsJob, Configs.scannedEventProcessorInterval * 1000))
}

/**
 * runs cleanUp job for txAgreement
 */
const resetJob = () => {
    txAgreement.clearAgreedTransactions().then(() => setTimeout(resetJob, Utils.secondsToReset() * 1000))
}

/**
 * runs TransactionProcessor job
 */
const transactionJob = () => {
    TransactionProcessor.processTransactions().then(() => setTimeout(transactionJob, Configs.txProcessorInterval * 1000))
}

/**
 * runs all processors and their related jobs
 */
const runProcessors = () => {
    setTimeout(confirmedEventsJob, Utils.secondsToNextTurn() * 1000)
    setTimeout(resetJob, Utils.secondsToReset() * 1000)
    transactionJob()
}

export { runProcessors }
