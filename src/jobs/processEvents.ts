import EventProcessor from "../guard/EventProcessor";
import Utils from "../helpers/Utils";
import { txAgreement } from "../guard/agreement/TxAgreement";
import eventProcessor from "../guard/EventProcessor";
import Configs from "../helpers/Configs";


const resendTxInterval = 30 // seconds
let resendCount = 0
let resendInterval: NodeJS.Timer

const resendTxJob = () => {
    txAgreement.resendTransactionRequests()
    resendCount += 1
    if(resendCount >= 3) {
        clearInterval(resendInterval)
        resendCount = 0
    }
}

const processJob = () => {
    EventProcessor.processEvents().then(() => setTimeout(processJob, Utils.secondsToNextTurn()))
    resendInterval = setInterval(resendTxJob, resendTxInterval * 1000)
    setTimeout(txAgreement.clearTransactions, Utils.UP_TIME_LENGTH * 1000)
}

const resetJob = () => {
    txAgreement.clearAgreedTransactions().then(() => setTimeout(resetJob, Utils.secondsToReset()))
}

export const signJob = () => {
    eventProcessor.signApprovedEvents().then(() => setTimeout(signJob, Configs.signInterval))
}

export const processEvents = () => {
    setTimeout(processJob, Utils.secondsToNextTurn())
    setTimeout(resetJob, Utils.secondsToReset())
    signJob()
}
