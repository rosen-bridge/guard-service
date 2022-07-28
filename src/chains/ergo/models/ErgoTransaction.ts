import { PaymentTransaction } from "../../../models/Models";

class ErgoTransaction extends PaymentTransaction {

    inputBoxes: Uint8Array[]

    constructor(txId: string, eventId: string, txBytes: Uint8Array, inputBoxes: Uint8Array[]) {
        super("ergo", txId, eventId, txBytes);
        this.inputBoxes = inputBoxes
    }

    /**
     * @return transaction hex string
     */
    getInputBoxesString = (): string[] => {
        return this.inputBoxes.map(box => Buffer.from(box).toString('hex'))
    }

    /**
     * @return json representation of the transaction
     */
    override toJson = (): string => {
        return JSON.stringify({
            "network": this.network,
            "txId": this.txId,
            "eventId": this.eventId,
            "txBytes": this.getTxHexString(),
            "inputBoxes": this.getInputBoxesString()
        })
    }

}

export default ErgoTransaction
