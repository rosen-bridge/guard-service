import config from "config";
import { RosenConfig, rosenConfig } from "../../../helpers/RosenConfig";
import ChainsConstants from "../../ChainsConstants";
import Configs from "../../../helpers/Configs";

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
    static minimumErg = BigInt(config.get<string>('ergo.minimumErg'))
    static txFee = BigInt(config.get<string>('ergo.txFee'))

    static bridgeFeeRepoAddress: string = config.get?.('reward.bridgeFeeRepoAddress')
    static networkFeeRepoAddress: string = config.get?.('reward.networkFeeRepoAddress')
    static watchersSharePercent = BigInt(config.get?.('reward.watchersSharePercent'))
    static watchersRSNSharePercent = BigInt(config.get?.('reward.watchersRSNSharePercent'))

    static requiredConfirmation = config.get<number>('ergo.requiredConfirmation')
    static initialHeight = config.get<number>('ergo.initialHeight')
    static scannerInterval = config.get<number>('ergo.scannerInterval')

    /**
     * returns the ergo-related contract, addresses and tokens in rosen bridge
     */
    static ergoContractConfig = rosenConfig.contractReader(ChainsConstants.ergo)
}

export default ErgoConfigs
