import {
  AbstractEvmNetwork,
  EvmChain,
  EvmConfigs,
  TssSignFunction,
} from '@rosen-chains/evm';
import { TokenMap } from '@rosen-bridge/tokens';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { ETH, ETHEREUM_CHAIN, ETHEREUM_CHAIN_ID } from './constants';

class EthereumChain extends EvmChain {
  CHAIN = ETHEREUM_CHAIN;
  NATIVE_TOKEN_ID = ETH;
  CHAIN_ID = ETHEREUM_CHAIN_ID;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: TokenMap,
    signFunction: TssSignFunction,
    logger?: AbstractLogger
  ) {
    super(
      network,
      configs,
      tokens,
      signFunction,
      ETHEREUM_CHAIN,
      ETH,
      2,
      logger
    );
  }
}

export default EthereumChain;
