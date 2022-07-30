interface EventTriggerModel {

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

    /**
     * @return id of event trigger
     */
    getId: () => string

}

interface PaymentTransactionModel {

    network: string
    txId: string
    eventId: string
    txBytes: Uint8Array

    /**
     * @return transaction hex string
     */
    getTxHexString: () => string

    /**
     * signs the json data alongside guardId
     * @param creatorId id of the creator guard
     * @return signature
     */
    signMetaData: (creatorId: number) => string

    /**
     * verifies the signature over json data alongside guardId
     * @param signerId id of the signer guard
     * @param msgSignature hex string signature over json data alongside guardId
     * @return true if signature verified
     */
    verifyMetaDataSignature: (signerId: number, msgSignature: string) => boolean

}

interface PaymentTransactionJsonModel {
    network: string
    txId: string
    eventId: string
    txBytes: string
    type: string
}

export type {
    EventTriggerModel,
    PaymentTransactionModel,
    PaymentTransactionJsonModel
}
