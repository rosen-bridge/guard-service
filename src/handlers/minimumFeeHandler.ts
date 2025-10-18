import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import {
  ChainMinimumFee,
  ErgoNetworkType,
  MinimumFeeBox,
} from '@rosen-bridge/minimum-fee';
import { TokenMap } from '@rosen-bridge/tokens';
import { EventTrigger } from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';

import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import { rosenConfig } from '../configs/rosenConfig';
import { TokenHandler } from './tokenHandler';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

class MinimumFeeHandler {
  private static instance: MinimumFeeHandler;
  protected minimumFees = new Map<string, MinimumFeeBox>();

  private constructor() {
    // do nothing
  }

  /**
   * initializes minimum fee handler
   */
  /**
   * initializes minimum fee handler
   */
  static init = async (tokenMap: TokenMap) => {
    MinimumFeeHandler.instance = new MinimumFeeHandler();
    logger.debug('MinimumFeeHandler instantiated');

    // TODO: A function to apply token map updates is required for here
    // local:ergo/rosen-bridge/guard-service#430
    const promises = tokenMap.getConfig().map((chainToken) => {
      const token = chainToken[ERGO_CHAIN];
      const tokenId = token.tokenId;

      const { networkType, url } =
        GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
          ? {
              networkType: ErgoNetworkType.node,
              url: GuardsErgoConfigs.node.url,
            }
          : {
              networkType: ErgoNetworkType.explorer,
              url: GuardsErgoConfigs.explorer.url,
            };
      const tokenMinimumFeeBox = new MinimumFeeBox(
        tokenId,
        rosenConfig.rsnRatioNFT,
        networkType,
        url,
        logger,
      );
      MinimumFeeHandler.instance.minimumFees.set(tokenId, tokenMinimumFeeBox);
      return tokenMinimumFeeBox.fetchBox();
    });

    await Promise.all(promises);
    logger.info('MinimumFeeHandler initialized');
  };

  /**
   * generates a MinimumFeeHandler object if it doesn't exist
   * @returns MinimumFeeHandler instance
   */
  static getInstance = () => {
    if (!MinimumFeeHandler.instance)
      throw Error(`MinimumFeeHandler instance doesn't exist`);
    return MinimumFeeHandler.instance;
  };

  /**
   * gets minimum fee config for an event on it's target chain
   * @param event the event trigger
   */
  static getEventFeeConfig = (event: EventTrigger): ChainMinimumFee => {
    const instance = MinimumFeeHandler.getInstance();

    const tokenId = TokenHandler.getInstance()
      .getTokenMap()
      .getID(
        TokenHandler.getInstance().getTokenMap().search(event.fromChain, {
          tokenId: event.sourceChainTokenId,
        })[0],
        ERGO_CHAIN,
      );

    const feeBox = instance.getMinimumFeeBoxObject(tokenId);

    return feeBox.getFee(
      event.fromChain,
      event.sourceChainHeight,
      event.toChain,
    );
  };

  /**
   * gets MinimumFeeBox object
   * @param tokenId token id on Ergo chain
   */
  getMinimumFeeBoxObject = (tokenId: string): MinimumFeeBox => {
    const res = this.minimumFees.get(tokenId);
    if (!res)
      throw Error(
        `No minimum fee config is registered for token [${tokenId}]. Make sure id is for Ergo side and the token is in token map`,
      );
    return res;
  };

  /**
   * updates minimum fee boxes
   */
  update = async (): Promise<void> => {
    for (const minimumFee of this.minimumFees.values()) {
      await minimumFee.fetchBox();
    }
  };
}

export default MinimumFeeHandler;
