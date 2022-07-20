import { EventTrigger, PaymentTransaction } from "../models/Models";
import BaseChain from "../chains/BaseChains";
import CardanoChain from "../chains/cardano/CardanoChain";
import ErgoChain from "../chains/ergo/ErgoChain";
import ChainsConstants from "../chains/ChainsConstants";
import KoiosApi from "../chains/cardano/network/KoiosApi";
import CardanoConfigs from "../chains/cardano/helpers/CardanoConfigs";
import ExplorerApi from "../chains/ergo/network/ExplorerApi";
import ErgoConfigs from "../chains/ergo/helpers/ErgoConfigs";


class EventProcessor {

    static cardanoChain = new CardanoChain()
    static ergoChain = new ErgoChain()

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

}

export default EventProcessor
