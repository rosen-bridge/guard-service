import config from "config";
import { rosenConfig } from "../../../helpers/RosenConfig";
import ChainsConstants from "../../ChainsConstants";

class ErgoConfigs {

    // service configs
    static explorer = {
        url: config.get<string>('ergo.explorer.url'),
        timeout: config.get<number>('ergo.explorer.timeout') // seconds
    }
    static node = {
        url: config.get<string>('ergo.node.url'),
        timeout: config.get<number>('ergo.node.timeout') // seconds
    }
    static bankAddress = config.get<string>('ergo.bankAddress')
    static minimumErg = BigInt(config.get<string>('ergo.minimumErg'))
    static txFee = BigInt(config.get<string>('ergo.txFee'))

    static bridgeFeeRepoAddress: string = config.get?.('reward.bridgeFeeRepoAddress')
    static networkFeeRepoAddress: string = config.get?.('reward.networkFeeRepoAddress')
    static watchersSharePercent = BigInt(config.get?.('reward.watchersSharePercent'))
    static watchersRSNSharePercent = BigInt(config.get?.('reward.watchersRSNSharePercent'))

    static requiredConfirmation = config.get<number>('ergo.requiredConfirmation')
    static requiredSigns = config.get<number>('ergo.requiredSigns')
    static initialHeight = config.get<number>('ergo.initialHeight')
    static scannerInterval = config.get<number>('ergo.scannerInterval')

    /**
     * returns the ergo-related contract, addresses and tokens in rosen bridge
     */
    static ergoContractConfig = () => {
        const contracts = rosenConfig.contracts.get(ChainsConstants.ergo)
        if(!contracts) throw Error("ergo contracts and token config is not set")
        return contracts
    }
}

export default ErgoConfigs
