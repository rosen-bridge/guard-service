import { EventTrigger, PaymentTransaction } from "../models/Models";
import BaseChain from "../chains/BaseChains";
import CardanoChain from "../chains/cardano/CardanoChain";
import ErgoChain from "../chains/ergo/ErgoChain";
import ChainsConstants from "../chains/ChainsConstants";
import KoiosApi from "../chains/cardano/network/KoiosApi";
import CardanoConfigs from "../chains/cardano/helpers/CardanoConfigs";
import ExplorerApi from "../chains/ergo/network/ExplorerApi";
import ErgoConfigs from "../chains/ergo/helpers/ErgoConfigs";
import { dbAction } from "../db/DatabaseAction";
import { txAgreement } from "./agreement/TxAgreement";
import Reward from "../chains/ergo/Reward";
import Utils from "../helpers/Utils";


class EventProcessor {

    static cardanoChain = new CardanoChain()
    static ergoChain = new ErgoChain()

    /**
     * process captured events by scanner, insert new confirmed ones to ConfirmedEvents table
     */
    static processScannedEvents = async (): Promise<void> => {
        const rawEvents = await dbAction.getUnspentEvents()
        for (const event of rawEvents) {
            try {
                const eventId = Utils.txIdToEventId(event.sourceTxId)
                const confirmedEvent = await dbAction.getEventById(eventId)
                if (confirmedEvent === null && await this.isEventConfirmedEnough(EventTrigger.fromEntity(event))) {
                    console.log(`event with txId [${event.sourceTxId}] confirmed. eventId: ${eventId}`)
                    await dbAction.insertConfirmedEvent(event)
                }
            }
            catch (e) {
                console.log(`An error occurred while processing event [${event.id}]: ${e}`)
            }
        }
    }

    /**
     * processes pending event triggers in the database
     */
    static processConfirmedEvents = async (): Promise<void> => {
        const confirmedEvents = await dbAction.getPendingEvents()
        for (const event of confirmedEvents) {
            try {
                if (event.status === "pending-payment")
                    await this.processPaymentEvent(EventTrigger.fromConfirmedEntity(event))
                else if (event.status === "pending-reward")
                    await this.processRewardEvent(EventTrigger.fromConfirmedEntity(event))
                else
                    console.warn(`impossible case, received event [${event.id}] with status [${event.status}]`)
            }
            catch (e) {
                console.log(`An error occurred while processing event [${event.id}]: ${e}`)
            }
        }
    }

    /**
     * processes the event trigger to create payment transaction
     *  1. verify event data with lock tx in source chain
     *  2. create transaction
     *  3. start agreement process on transaction
     * @param event the event trigger
     */
    static processPaymentEvent = async (event: EventTrigger): Promise<void> => {
        console.log(`processing event [${event.getId()}]`)
        if (!await this.verifyEvent(event)) {
            console.log(`event didn't verify.`)
            await dbAction.setEventStatus(event.getId(), "rejected")
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

        const tx = await Reward.generateTransaction(event)
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
    static verifyPaymentTransactionWithEvent = async (paymentTx: PaymentTransaction, event: EventTrigger): Promise<boolean> => {
        return await this.getDestinationChainObject(event).verifyTransactionWithEvent(paymentTx, event)
    }

    /**
     * conforms event data with lock transaction in source chain
     * @param event the trigger event
     * @return true if event data verified
     */
    static verifyEvent = async (event: EventTrigger): Promise<boolean> => {
        if (event.fromChain === ChainsConstants.cardano)
            return this.cardanoChain.verifyEventWithPayment(event)
        else if (event.fromChain === ChainsConstants.ergo)
            return this.ergoChain.verifyEventWithPayment(event)
        else throw new Error(`chain [${event.fromChain}] not implemented.`)
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
