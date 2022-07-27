import CardanoConfigs from "./CardanoConfigs";

class CardanoUtils{

    /**
     * reads asset unit from assets fingerprint unit map in config file, throws error if fingerprint not found
     * @param fingerprint asset fingerprint
     */
    static getAssetUnitFromConfigFingerPrintMap = (fingerprint: string): Uint8Array => {
        const token=CardanoConfigs.tokenMap.search('cardano',{fingerprint:fingerprint});
        if(token.length===0)throw new Error(`asset fingerprint [${fingerprint}] not found in config`)
        return Buffer.from(token[0]['cardano']['unit'],'hex');
    }

}

export default CardanoUtils
