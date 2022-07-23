import CardanoConfigs from "./CardanoConfigs";
import { MetaData, RosenData } from "../models/Interfaces";

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

    /**
     * check if the object is the rosen bridge data type or not
     * @param data
     * @return boolean
     */
    static isRosenData(data: object): data is RosenData {
        return 'to' in data &&
            'bridgeFee' in data &&
            'networkFee' in data &&
            'targetChainTokenId' in data &&
            'toAddress' in data;
    }

    /**
     * check if the metadata of cardano transaction have `0` key or not
     * @param metaData
     * @return boolean
     */
    static isRosenMetaData(metaData: object): metaData is MetaData {
        return "0" in metaData;
    }

}

export default CardanoUtils
