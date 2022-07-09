import { PaymentTransactionModel, EventTriggerModel } from "./Interfaces";
import Codecs from "../helpers/Codecs";
import Configs from "../helpers/Configs";
import { EventTriggerEntity } from "../db/entities/scanner/EventTriggerEntity";


/* tslint:disable:max-classes-per-file */
class EventTrigger implements EventTriggerModel {

    fromChain: string
    toChain: string
    fromAddress: string
    toAddress: string
    amount: string
    bridgeFee: string
    networkFee: string
    sourceChainTokenId: string
    targetChainTokenId: string
    sourceTxId: string
    sourceBlockId: string
    WIDs: string[]

    constructor(fromChain: string, toChain: string, fromAddress: string, toAddress: string, amount: string,
                bridgeFee: string, networkFee: string, sourceChainTokenId: string, targetChainTokenId: string,
                sourceTxId: string, sourceBlockId: string, WIDs: string[]) {
        this.fromChain = fromChain
        this.toChain = toChain
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
        this.bridgeFee = bridgeFee
        this.networkFee = networkFee
        this.sourceChainTokenId = sourceChainTokenId
        this.targetChainTokenId = targetChainTokenId
        this.sourceTxId = sourceTxId
        this.sourceBlockId = sourceBlockId
        this.WIDs = WIDs
    }

    /**
     * creates EventTrigger object from its database scheme
     * @param eventEntity
     */
    static fromEntity = (eventEntity: EventTriggerEntity): EventTrigger => {
        return new EventTrigger(
            eventEntity.fromChain,
            eventEntity.toChain,
            eventEntity.fromAddress,
            eventEntity.toAddress,
            eventEntity.amount,
            eventEntity.bridgeFee,
            eventEntity.networkFee,
            eventEntity.sourceChainTokenId,
            eventEntity.targetChainTokenId,
            eventEntity.sourceTxId,
            eventEntity.sourceBlockId,
            eventEntity.WIDs
        )
    }

    /**
     * @return id of event trigger
     */
    getId = () => {
        return this.sourceTxId
    }

}

class PaymentTransaction implements PaymentTransactionModel {

    network: string
    txId: string
    eventId: string
    txBytes: Uint8Array

    constructor(network: string, txId: string, eventId: string, txBytes: Uint8Array) {
        this.network = network
        this.txId = txId
        this.eventId = eventId
        this.txBytes = txBytes
    }

    /**
     * @return transaction hex string
     */
    getTxHexString = () => {
        return Buffer.from(this.txBytes).toString('hex')
    }

    /**
     * signs the json data alongside guardId
     * @return signature
     */
    signMetaData = (): string => {
        const idBuffer = Codecs.numberToByte(Configs.guardId)
        const data = Buffer.concat([this.txBytes, idBuffer]).toString("hex")

        const signature  = Codecs.sign(data, Buffer.from(Configs.guardSecret, "hex"))
        return Buffer.from(signature).toString("hex")
    }

    /**
     * verifies the signature over json data alongside guardId
     * @param signerId id of the signer guard
     * @param msgSignature hex string signature over json data alongside guardId
     * @return true if signature verified
     */
    verifyMetaDataSignature = (signerId: number, msgSignature: string): boolean => {
        const idBuffer = Codecs.numberToByte(signerId)
        const data = Buffer.concat([this.txBytes, idBuffer]).toString("hex")
        const signatureBytes = Buffer.from(msgSignature, "hex")

        const publicKey = Configs.guards.find(guard => guard.guardId == signerId)?.guardPubKey
        if (publicKey === undefined) {
            console.warn(`no guard found with id ${signerId}`)
            return false
        }

        return Codecs.verify(data, signatureBytes, Buffer.from(publicKey, "hex"))
    }

    /**
     * @return json representation of the transaction
     */
    toJson = (): string => {
        return JSON.stringify({
            "network": this.network,
            "txId": this.txId,
            "eventId": this.eventId,
            "txBytes": this.getTxHexString()
        })
    }

}

export {
    EventTrigger,
    PaymentTransaction
}
