import Configs from "../../../helpers/Configs";
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

}

export default ErgoConfigs
