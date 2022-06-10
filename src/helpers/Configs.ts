import config from "config";

class Configs {

    // token configs
    static ergoRWT: string = config.get?.('tokens.ergoRWT')
    static cardanoRWT: string = config.get?.('tokens.cardanoRWT')

}

export default Configs
