import config from "config";

class ErgoConfigs {

    // service configs
    static bankAddress: string = config.get?.('ergo.bankAddress')
    static minimumErg = BigInt(config.get?.('ergo.minimumErg'))
    static txFee = BigInt(config.get?.('ergo.txFee'))

    static bridgeFeeRepoAddress: string = config.get?.('reward.bridgeFeeRepoAddress')
    static networkFeeRepoAddress: string = config.get?.('reward.networkFeeRepoAddress')
    static watchersSharePercent = BigInt(config.get?.('reward.watchersSharePercent'))

}

export default ErgoConfigs
