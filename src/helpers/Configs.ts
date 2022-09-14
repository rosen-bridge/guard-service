import config from "config";
import { GuardInfo } from "../guard/agreement/Interfaces";
import { RosenTokens, TokenMap } from "@rosen-bridge/tokens";
import fs from "fs";

/**
 * reads a config, set default value if it does not exits
 * @param key
 * @param defaultValue
 */
const getConfigIntKeyOrDefault = (key: string, defaultValue: number) => {
    const val: string = config.get(key)
    if (val) {
        const valNum = parseInt(val)
        if (isNaN(valNum)) {
            return defaultValue;
        }
        return valNum
    }
    return defaultValue
}

/**
 * compare function for sorting guards public keys based on their indexes
 * @param a
 * @param b
 */
const guardsInfoCompareFunction = (a: GuardInfo, b: GuardInfo): number => {
    if (a.guardId < b.guardId) return -1
    else if (a.guardId > b.guardId) return 1
    else return 0
}

class Configs {

    static secret: Uint8Array = Uint8Array.from(Buffer.from(config.get?.('secret') as string, 'hex'))

    // express config
    static expressPort = config.get<number>('express.port')
    private static expressBodyLimitValue = config.get<number>('express.jsonBodyLimit')
    static expressBodyLimit = `${this.expressBodyLimitValue}mb`

    // config of API's route
    static MAX_LENGTH_CHANNEL_SIZE = 200

    // tss configs
    static tssExecutionPath = config.get<string>('tss.path')
    static tssConfigPath = config.get<string>('tss.configPath')
    static tssUrl = config.get<string>('tss.url')
    static tssPort = config.get<string>('tss.port')
    static tssTimeout = config.get<number>('tss.timeout') // seconds
    static tssCallBackUrl = `http://localhost:${this.expressPort}/tss/sign`

    // guards configs
    static guardId = config.get<number>('guard.guardId')
    static guardSecret = config.get<string>('guard.secret')
    static guardsLen = config.get<number>('guard.guardsLen')
    static guards = config.get<GuardInfo[]>('guard.guards')
    // TODO: get this from config box in blockchain
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/24
    static guardsPublicKeys = [...this.guards].sort(guardsInfoCompareFunction).map(guard => guard.guardPubKey)

    // agreement configs (minimum number of guards that needs to agree with tx to get approved)
    // TODO: get this from config box in blockchain
    //  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/24
    static minimumAgreement = config.get<number>('minimumAgreement')

    // contract, addresses and tokens config
    static networks = config.get<Array<string>>('contracts.networks')
    static addressesBasePath = config.get<string>('contracts.addressesBasePath')
    static tokens = (): RosenTokens => {
        const tokensPath = config.get<string>('tokensPath')
        if (!fs.existsSync(tokensPath)) {
            throw new Error(`tokens config file with path ${tokensPath} doesn't exist`)
        } else {
            const configJson: string = fs.readFileSync(tokensPath, 'utf8')
            return JSON.parse(configJson)
        }
    }
    static tokenMap = new TokenMap(this.tokens());

    // jobs configs
    static scannedEventProcessorInterval = 120 // seconds, 2 minutes
    static txProcessorInterval = config.get<number>('txProcessorInterval') // seconds
    static txResendInterval = 30 // seconds
    static multiSigCleanUpInterval = 120 // seconds
    static multiSigTimeout = getConfigIntKeyOrDefault('multiSigTimeout', 5 * 60) // seconds

}

export default Configs
