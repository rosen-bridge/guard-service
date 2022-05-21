import { PaymentTransaction, EventTrigger } from "../models/Models";

export default interface BaseChain<TransactionType> {

    /**
     * generates payment transaction of the event from multi-sig address in target chain
     * @param event the event trigger model
     * @return the generated payment transaction
     */
    generateTransaction: (event: EventTrigger) => Promise<PaymentTransaction>

    /**
     * verifies the payment transaction data with the event
     * @param tx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent: (tx: PaymentTransaction, event: EventTrigger) => boolean

    /**
     * converts the transaction model in the chain to bytearray
     * @param tx the transaction model in the chain library
     * @return bytearray representation of the transaction
     */
    serialize: (tx: TransactionType) => Uint8Array

    /**
     * converts bytearray representation of the transaction to the transaction model in the chain
     * @param txBytes bytearray representation of the transaction
     * @return the transaction model in the chain library
     */
    deserialize: (txBytes: Uint8Array) => TransactionType

}
