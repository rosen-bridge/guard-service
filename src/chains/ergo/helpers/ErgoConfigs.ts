import config from "config";

class ErgoConfigs {

    // service configs
    static bankAddress: string = config.get<string>('ergo.bankAddress')
    static minimumErg = BigInt(config.get<string>('ergo.minimumErg'))
    static txFee = BigInt(config.get<string>('ergo.txFee'))

}

export default ErgoConfigs
