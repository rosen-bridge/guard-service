import config from "config";
import { GuardInfo } from "../guard/agreement/Interfaces";

class Configs {

    static expressPort = config.get<number>('express.port')
    private static expressBodyLimitValue = config.get<number>('express.jsonBodyLimit')
    static expressBodyLimit = `${this.expressBodyLimitValue}mb`

    // token configs
    static ergoRWT = config.get<string>('tokens.ergoRWT')
    static cardanoRWT = config.get<string>('tokens.cardanoRWT')

    // tss configs
    static tssUrl = config.get<string>('tss.url')
    static tssPort = config.get<string>('tss.port')
    static tssTimeout = config.get<number>('tss.timeout')
    static tssCallBackUrl = `localhost:${this.expressPort}/tssSign`

    // guards configs
    static guardId = config.get<number>('guard.guardId')
    static guardSecret = config.get<string>('guard.secret')
    static guardsLen = config.get<number>('guard.guardsLen')
    static guards = config.get<GuardInfo[]>('guard.guards')

    // agreement configs (minimum number of guards that needs to agree with tx to get approved)
    static minimumAgreement = config.get<number>('minimumAgreement') // TODO: get this from config box in blockchain
    static signInterval = config.get<number>('signInterval')

}

export default Configs
