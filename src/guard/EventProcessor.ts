import { EventTrigger, PaymentTransaction } from "../models/Models";
import BaseChain from "../chains/BaseChains";
import CardanoChain from "../chains/cardano/CardanoChain";
import ErgoChain from "../chains/ergo/ErgoChain";
import ChainsConstants from "../chains/ChainsConstants";
import KoiosApi from "../chains/cardano/network/KoiosApi";
import CardanoConfigs from "../chains/cardano/helpers/CardanoConfigs";
import ExplorerApi from "../chains/ergo/network/ExplorerApi";
import ErgoConfigs from "../chains/ergo/helpers/ErgoConfigs";
import { scannerAction } from "../db/models/scanner/ScannerModel";
import { txAgreement } from "./agreement/TxAgreement";


class EventProcessor {

    static cardanoChain = new CardanoChain()
    static ergoChain = new ErgoChain()

    /**
     * processes all trigger events in the database
     */
    static processEvents = async (): Promise<void> => {
        const events = await scannerAction.getEventsByStatus("")

        for (const event of events) {
            try {
                await this.processEvent(EventTrigger.fromEntity(event))
            }
            catch (e) {
                console.log(`An error occurred while processing event [${event.sourceTxId}]: ${e}`)
            }
        }
    }

    /**
     * processes the trigger event
     *  1. verify that event confirmed enough in source chain
     *  2. verify event data with lock tx in source chain
     *  3. create transaction
     *  4. start agreement process on transaction
     * @param event the trigger event
     */
    static processEvent = async (event: EventTrigger): Promise<void> => {
        if (!await this.isEventConfirmedEnough(event)) return

        if (!await this.verifyEvent(event)) {
            console.log(`event [${event.sourceTxId}] didn't verify.`)
            await scannerAction.setEventStatus(event.sourceTxId, "rejected")
            return
        }
        console.log(`processing event ${event.getId}`)

        const tx = await this.createEventPayment(event)
        txAgreement.startAgreementProcess(tx)
    }

    /**
     * returns chain object for target chain of the event trigger
     * @param event the event trigger
     */
    static getDestinationChainObject = (event: EventTrigger): BaseChain<any, any> => {
        if (event.toChain === ChainsConstants.cardano) return this.cardanoChain
        else if (event.toChain === ChainsConstants.ergo) return this.ergoChain
        else throw new Error(`chain [${event.toChain}] not implemented.`)
    }

    /**
     * conforms payment transaction with the event trigger data
     * @param paymentTx the payment transaction
     * @param event the event trigger
     * @return true if payment transaction verified
     */
    static verifyPaymentTransactionWithEvent = (paymentTx: PaymentTransaction, event: EventTrigger): boolean => {
        return this.getDestinationChainObject(event).verifyTransactionWithEvent(paymentTx, event)
    }

    /**
     * conforms event data with lock transaction in source chain
     * @param event the trigger event
     * @return true if event data verified
     */
    static verifyEvent = async (event: EventTrigger): Promise<boolean> => {
        // TODO: verify event with lock transaction
        return true
    }

    /**
     * creates an unsigned transaction for payment on target chain
     * @param event the event trigger
     * @return created unsigned transaction
     */
    static createEventPayment = (event: EventTrigger): Promise<PaymentTransaction> => {
        return this.getDestinationChainObject(event).generateTransaction(event)
    }

    /**
     * checks if event source tx confirmed enough
     * @param event the event trigger
     */
    static isEventConfirmedEnough = async (event: EventTrigger): Promise<boolean> => {
        if (event.fromChain === ChainsConstants.cardano) {
            const confirmation = await KoiosApi.getTxConfirmation(event.sourceTxId)
            return confirmation >= CardanoConfigs.requiredConfirmation
        }
        else if (event.fromChain === ChainsConstants.ergo) {
            const confirmation = await ExplorerApi.getTxConfirmation(event.sourceTxId)
            return confirmation >= ErgoConfigs.requiredConfirmation
        }
        else throw new Error(`chain [${event.fromChain}] not implemented.`)
    }

    /**
     * sends request to sign tx for all events with approved tx
     */
    static signApprovedEvents = async (): Promise<void> => {
        const events = await scannerAction.getEventsByStatus("approved")

        for (const event of events) {
            try {
                const paymentTx = event.paymentTxJson
                await this.getDestinationChainObject(EventTrigger.fromEntity(event)).requestToSignTransaction(paymentTx)
            }
            catch (e) {
                console.log(`An error occurred while sending event [${event.sourceTxId}] tx to sign: ${e}`)
            }
        }
    }

}

export default EventProcessor
