import { BridgeMinimumFee } from '@rosen-bridge/minimum-fee';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import { rosenConfig } from '../helpers/RosenConfig';
import Configs from '../helpers/Configs';

class MinimumFee {
  static bridgeMinimumFee = new BridgeMinimumFee(
    ErgoConfigs.explorer.url,
    Configs.minimumFeeConfigBoxTemplateHash,
    rosenConfig.rsnRatioNFT
  );
}

export default MinimumFee;
