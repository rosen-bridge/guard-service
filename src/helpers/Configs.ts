import config from "config";

class Configs {

    // token configs
    static ergoRWT = config.get<string>('tokens.ergoRWT')
    static cardanoRWT = config.get<string>('tokens.cardanoRWT')

    // tss configs
    static tssUrl = config.get<string>('tss.url')
    static tssTimeout = config.get<number>('tss.timeout')
    static tssCallBackUrl = config.get<string>('tss.callBackBaseUrl') + "/tssSign"

}

export default Configs
