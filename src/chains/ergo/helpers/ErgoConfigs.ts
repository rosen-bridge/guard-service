import config from "config";

class ErgoConfigs {

    // service configs
    static bankAddress: string = config.get?.('ergo.bankAddress')
    static minimumErg: bigint = BigInt(config.get?.('ergo.minimumErg'))
    static txFee: bigint = BigInt(config.get?.('ergo.txFee'))

}

export default ErgoConfigs
