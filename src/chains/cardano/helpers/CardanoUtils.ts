import { MetaData, RosenData } from '../models/Interfaces';
import Configs from '../../../helpers/Configs';
import ChainsConstants from '../../ChainsConstants';

class CardanoUtils {
  /**
   * reads asset unit from assets fingerprint unit map in config file, throws error if fingerprint not found
   * @param fingerprint asset fingerprint
   */
  static getAssetPolicyAndNameFromConfigFingerPrintMap = (
    fingerprint: string
  ): [Uint8Array, Uint8Array] => {
    const token = Configs.tokenMap.search(ChainsConstants.cardano, {
      fingerprint: fingerprint,
    });
    if (token.length === 0)
      throw new Error(`Asset fingerprint [${fingerprint}] not found in config`);
    return [
      Buffer.from(token[0][ChainsConstants.cardano]['policyID'], 'hex'),
      Buffer.from(token[0][ChainsConstants.cardano]['assetID'], 'hex'),
    ];
  };

  /**
   * returns rosenData object if the box format is like rosen bridge observations otherwise returns undefined
   * @param metaDataArray
   */
  static getRosenData = (
    metaDataArray: Array<MetaData>
  ): RosenData | undefined => {
    if (metaDataArray.length > 0 && metaDataArray[0].key === '0') {
      const metaData = metaDataArray[0].json;
      if (
        'to' in metaData &&
        'bridgeFee' in metaData &&
        'networkFee' in metaData &&
        'toAddress' in metaData
      ) {
        const rosenData = metaData as unknown as {
          to: string;
          bridgeFee: string;
          networkFee: string;
          toAddress: string;
        };
        return {
          toChain: rosenData.to,
          bridgeFee: rosenData.bridgeFee,
          networkFee: rosenData.networkFee,
          toAddress: rosenData.toAddress,
        };
      }
    }
    return undefined;
  };
}

export default CardanoUtils;
