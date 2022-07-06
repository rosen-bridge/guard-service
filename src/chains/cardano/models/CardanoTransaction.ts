import { PaymentTransaction } from "../../../models/Models";

class CardanoTransaction extends PaymentTransaction {

    constructor(txId: string, eventId: string, txBytes: Uint8Array) {
        super("cardano", txId, eventId, txBytes);
    }

}

export default CardanoTransaction
