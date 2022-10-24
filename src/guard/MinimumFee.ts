import { BridgeMinimumFee } from '@rosen-bridge/minimum-fee';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import { rosenConfig } from '../helpers/RosenConfig';

class MinimumFee {
  static bridgeMinimumFee = new BridgeMinimumFee(
    ErgoConfigs.explorer.url,
    'TODO',
    rosenConfig.rsnRatioNFT
  );
}

export default MinimumFee;
