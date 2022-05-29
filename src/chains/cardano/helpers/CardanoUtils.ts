import CardanoConfigs from "./CardanoConfigs";

class CardanoUtils {

    /**
     * reads asset unit from assets fingerprint unit map in config file, throws error if fingerprint not found
     * @param fingerprint asset fingerpring
     */
    static getAssetUnitFromConfigFingerPrintMap = (fingerprint: string): Uint8Array => {
        const paymentAssetUnit: Uint8Array | undefined = CardanoConfigs.assetFingerprintUnitTuples.get(fingerprint)
        if (paymentAssetUnit === undefined) throw new Error(`asset fingerprint [${fingerprint}] not found in config`)
        return paymentAssetUnit
    }

}

export default CardanoUtils
