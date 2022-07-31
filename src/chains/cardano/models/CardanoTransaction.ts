import { PaymentTransaction } from "../../../models/Models";

class CardanoTransaction extends PaymentTransaction {

    constructor(txId: string, eventId: string, txBytes: Uint8Array, txType: string) {
        super("cardano", txId, eventId, txBytes, txType);
    }

}

export default CardanoTransaction
