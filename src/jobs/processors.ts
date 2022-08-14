import EventProcessor from "../guard/EventProcessor";
import Utils from "../helpers/Utils";
import { txAgreement } from "../guard/agreement/TxAgreement";
import Configs from "../helpers/Configs";
import TransactionProcessor from "../guard/TransactionProcessor";


const resendTxInterval = 30 // seconds

const resendTxJob = () => {
    if (Utils.secondsToReset() < Utils.UP_TIME_LENGTH) {
        txAgreement.resendTransactionRequests()
        setTimeout(resendTxJob, resendTxInterval * 1000)
    }
}

const processJob = () => {
    EventProcessor.processConfirmedEvents().then(() => {
        setTimeout(processJob, Utils.secondsToNextTurn())
        setTimeout(resendTxJob, resendTxInterval * 1000)
    })
    setTimeout(txAgreement.clearTransactions, Utils.UP_TIME_LENGTH * 1000)
}

const resetJob = () => {
    txAgreement.clearAgreedTransactions().then(() => setTimeout(resetJob, Utils.secondsToReset()))
}

export const transactionJob = () => {
    TransactionProcessor.processTransactions().then(() => setTimeout(transactionJob, Configs.txProcessorInterval))
}

export const processors = () => {
    setTimeout(processJob, Utils.secondsToNextTurn())
    setTimeout(resetJob, Utils.secondsToReset())
    transactionJob()
}
