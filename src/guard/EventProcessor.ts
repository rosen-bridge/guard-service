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
import Reward from "../chains/ergo/Reward";


class EventProcessor {

    static cardanoChain = new CardanoChain()
    static ergoChain = new ErgoChain()
    static reward = new Reward()

    /**
     * processes pending event triggers in the database
     */
    static processEvents = async (): Promise<void> => {
        const events = await scannerAction.getPendingEvents()
        // TODO: get only pending events

        for (const event of events) {
            try {
                if (event.status === "pending-payment")
                    await this.processPaymentEvent(EventTrigger.fromEntity(event))
                else if (event.status === "pending-reward")
                    await this.processRewardEvent(EventTrigger.fromEntity(event))
                else
                    console.warn(`impossible case, received event [${event.sourceTxId}] with status [${event.status}]`)
            }
            catch (e) {
                console.log(`An error occurred while processing event [${event.sourceTxId}]: ${e}`)
            }
        }
    }

    /**
     * processes the event trigger to create payment transaction
     *  1. verify that event confirmed enough in source chain
     *  2. verify event data with lock tx in source chain
     *  3. create transaction
     *  4. start agreement process on transaction
     * @param event the event trigger
     */
    static processPaymentEvent = async (event: EventTrigger): Promise<void> => {
        console.log(`processing event [${event.sourceTxId}]`)
        if (!await this.isEventConfirmedEnough(event)) return

        if (!await this.verifyEvent(event)) {
            console.log(`event didn't verify.`)
            await scannerAction.setEventStatus(event.sourceTxId, "rejected")
            return
        }

        const tx = await this.createEventPayment(event)
        txAgreement.startAgreementProcess(tx)
    }

    /**
     * processes the event trigger to create reward distribution transaction
     * @param event the event trigger
     */
    static processRewardEvent = async (event: EventTrigger): Promise<void> => {
        console.log(`processing event [${event.sourceTxId}]`)
        if (event.toChain === ChainsConstants.ergo)
            throw Error(`Events with Ergo as target chain will distribute rewards in a single transaction with payment`)

        const tx = await this.reward.generateTransaction(event)
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
            return (confirmation !== null && confirmation >= CardanoConfigs.requiredConfirmation)
        }
        else if (event.fromChain === ChainsConstants.ergo) {
            const confirmation = await ExplorerApi.getTxConfirmation(event.sourceTxId)
            return confirmation >= ErgoConfigs.requiredConfirmation
        }
        else throw new Error(`chain [${event.fromChain}] not implemented.`)
    }

}

export default EventProcessor
