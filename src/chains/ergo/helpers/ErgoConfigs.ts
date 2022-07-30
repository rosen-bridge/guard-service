import config from "config";

class ErgoConfigs {

    // service configs
    static explorer = {
        url: config.get<string>('ergo.explorer.url'),
        timeout: config.get<number>('ergo.explorer.timeout')
    }
    static node = {
        url: config.get<string>('ergo.node.url'),
        timeout: config.get<number>('ergo.node.timeout')
    }
    static bankAddress = config.get<string>('ergo.bankAddress')
    static minimumErg = BigInt(config.get<string>('ergo.minimumErg'))
    static txFee = BigInt(config.get<string>('ergo.txFee'))

    static bridgeFeeRepoAddress: string = config.get?.('reward.bridgeFeeRepoAddress')
    static networkFeeRepoAddress: string = config.get?.('reward.networkFeeRepoAddress')
    static watchersSharePercent = BigInt(config.get?.('reward.watchersSharePercent'))

    static requiredConfirmation = config.get<number>('ergo.requiredConfirmation')
    static requiredSigns = config.get<number>('ergo.requiredSigns')

}

export default ErgoConfigs
