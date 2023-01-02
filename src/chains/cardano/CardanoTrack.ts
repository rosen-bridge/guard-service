import { UtxoBoxesAssets } from './models/Interfaces';
import KoiosApi from './network/KoiosApi';
import CardanoConfigs from './helpers/CardanoConfigs';
import { BigNum } from '@emurgo/cardano-serialization-lib-nodejs';
import { ImpossibleBehavior } from '../../helpers/errors';

// TODO: include this class in refactor (#109)
class CardanoTrack {
  /**
   * checks if lock address assets are more than required assets or not
   * @param required required amount of erg and tokens
   */
  static hasLockAddressEnoughAssets = async (
    required: UtxoBoxesAssets
  ): Promise<boolean> => {
    // get lock lovelace
    const lockLovelace = (
      await KoiosApi.getAddressInfo(CardanoConfigs.bankAddress)
    ).balance;

    if (required.lovelace.compare(BigNum.from_str(lockLovelace.toString())) > 0)
      return false;

    // get lock assets
    const assets = (await KoiosApi.getAddressAssets(CardanoConfigs.bankAddress))
      .asset_list;

    // iterate over required assets and compared required amount to locked amount
    for (let i = 0; i < required.assets.keys().len(); i++) {
      const policyId = required.assets.keys().get(i);
      const hexPolicyId = policyId.to_hex();
      const policyAssets = required.assets.get(policyId);

      if (!policyAssets)
        throw new ImpossibleBehavior(
          'MultiAsset contains policyId with no assetName'
        );

      for (let j = 0; j < policyAssets.keys().len(); j++) {
        const assetName = policyAssets.keys().get(j);
        const hexAssetName = assetName.to_js_value();
        const assetAmount = policyAssets.get(assetName);

        if (!assetAmount)
          throw new ImpossibleBehavior(
            'MultiAsset contains assetName with no amount'
          );

        const lockedAmount = assets.find(
          (asset) =>
            asset.policy_id === hexPolicyId && asset.asset_name === hexAssetName
        );

        if (
          !lockedAmount ||
          assetAmount?.compare(BigNum.from_str(lockedAmount.quantity)) > 0
        )
          return false;
      }
    }

    return true;
  };
}

export default CardanoTrack;
