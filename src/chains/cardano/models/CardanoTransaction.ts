import { PaymentTransaction } from "../../../models/Models";

class CardanoTransaction extends PaymentTransaction {

    constructor(txId: string, eventId: string, txBytes: Uint8Array, type: string) {
        super("cardano", txId, eventId, txBytes, type);
    }

}

export default CardanoTransaction
