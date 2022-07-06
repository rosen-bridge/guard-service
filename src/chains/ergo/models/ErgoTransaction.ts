import { PaymentTransaction } from "../../../models/Models";

class ErgoTransaction extends PaymentTransaction {

    inputBoxes: Uint8Array[]

    constructor(txId: string, eventId: string, txBytes: Uint8Array, inputBoxes: Uint8Array[]) {
        super("ergo", txId, eventId, txBytes);
        this.inputBoxes = inputBoxes
    }

}

export default ErgoTransaction
