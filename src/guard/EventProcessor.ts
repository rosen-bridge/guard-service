import { EventTrigger, PaymentTransaction } from "../models/Models";
import BaseChain from "../chains/BaseChains";
import CardanoChain from "../chains/cardano/CardanoChain";


class EventProcessor {

    cardanoChain = new CardanoChain()

    /**
     * returns chain object for target chain of the event trigger
     * @param event the event trigger
     */
    getDestinationChainObject = (event: EventTrigger): BaseChain<any> => {
        if (event.toChain === ChainsConstants.cardano) return this.cardanoChain
        else throw new Error(`chain [${event.toChain}] not implemented.`)
    }

    /**
     * conforms payment transaction with the event trigger data
     * @param paymentTx the payment transaction
     * @param event the event trigger
     * @return true if payment transaction verified
     */
    verifyPaymentTransactionWithEvent = (paymentTx: PaymentTransaction, event: EventTrigger): boolean => {
        return this.getDestinationChainObject(event).verifyTransactionWithEvent(paymentTx, event)
    }

    /**
     * creates an unsigned transaction for payment on target chain
     * @param event the event trigger
     * @return created unsigned transaction
     */
    createEventPayment = (event: EventTrigger): Promise<PaymentTransaction> => {
        return this.getDestinationChainObject(event).generateTransaction(event)
    }

}

export default EventProcessor
