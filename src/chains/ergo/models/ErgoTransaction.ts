import { PaymentTransaction } from "../../../models/Models";
import ErgoUtils from "../helpers/Utils";
import { ErgoTransactionJsonModel } from "./Interfaces";
import Utils from "../helpers/Utils";

class ErgoTransaction extends PaymentTransaction {

    inputBoxes: Uint8Array[]

    constructor(txId: string, eventId: string, txBytes: Uint8Array, inputBoxes: Uint8Array[], type: string) {
        super("ergo", txId, eventId, txBytes, type);
        this.inputBoxes = inputBoxes
    }

    static fromJson = (jsonString: string): ErgoTransaction => {
        const obj = JSON.parse(jsonString) as ErgoTransactionJsonModel
        return new ErgoTransaction(
            obj.txId,
            obj.eventId,
            ErgoUtils.hexStringToUint8Array(obj.txBytes),
            obj.inputBoxes.map(box => Utils.hexStringToUint8Array(box)),
            obj.type
        )
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
