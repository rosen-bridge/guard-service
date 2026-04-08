import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractEvmNetwork,
  EvmChain,
  EvmChainSignMediator,
  EvmConfigs,
} from '@rosen-chains/evm';

import { ETH, ETHEREUM_CHAIN, ETHEREUM_CHAIN_ID } from './constants';

class EthereumChain extends EvmChain {
  CHAIN = ETHEREUM_CHAIN;
  NATIVE_TOKEN_ID = ETH;
  CHAIN_ID = ETHEREUM_CHAIN_ID;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: TokenMap,
    signMediator: EvmChainSignMediator,
    logger?: AbstractLogger,
  ) {
    super(
      network,
      configs,
      tokens,
      signMediator,
      ETHEREUM_CHAIN,
      ETH,
      2,
      logger,
    );
  }
}

export default EthereumChain;
