
class TssSigner {

    /**
     * sends request to TSS service to sign a transaction
     * @param txHash
     * @return bytes of signed message
     */
    static signTxHash = (txHash: Uint8Array): Uint8Array => {
        return Buffer.from("00", "hex") // TODO: implement this
    }

}

export default TssSigner
