import { BridgeMinimumFee, Fee } from '@rosen-bridge/minimum-fee';
import { rosenConfig } from '../configs/RosenConfig';
import Configs from '../configs/Configs';
import { EventTrigger } from '@rosen-chains/abstract-chain';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

class MinimumFee {
  static bridgeMinimumFee = new BridgeMinimumFee(
    GuardsErgoConfigs.explorer.url,
    rosenConfig.rsnRatioNFT
  );

  /**
   * gets minimum fee config for an event on it's target chain
   * @param event the event trigger
   */
  static getEventFeeConfig = async (event: EventTrigger): Promise<Fee> => {
    const tokenId = Configs.tokenMap.getID(
      Configs.tokenMap.search(event.fromChain, {
        [Configs.tokenMap.getIdKey(event.fromChain)]: event.sourceChainTokenId,
      })[0],
      ERGO_CHAIN
    );
    return await MinimumFee.bridgeMinimumFee.getFee(
      tokenId,
      event.fromChain,
      event.sourceChainHeight
    );
  };
}

export default MinimumFee;
