import config from "config";

const getConfigIntKeyOrDefault = (key: string, defaultValue: number) => {
    const val: string = config.get(key)
    if(val){
        const valNum = parseInt(val)
        if(isNaN(valNum)){
            return defaultValue;
        }
        return valNum
    }
    return defaultValue
}
class Configs {

    static secret: Uint8Array = Uint8Array.from(Buffer.from(config.get?.('secret') as string, 'hex'))
    // token configs
    static ergoRWT: string = config.get?.('tokens.ergoRWT')
    static cardanoRWT: string = config.get?.('tokens.cardanoRWT')
    static multiSigTimeout: number = getConfigIntKeyOrDefault('multiSigTimeout', 15 * 60 * 1000)
}

export default Configs
