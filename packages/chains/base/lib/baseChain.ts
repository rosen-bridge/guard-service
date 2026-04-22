import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractEvmNetwork,
  EvmChain,
  EvmChainSignMediator,
  EvmConfigs,
} from '@rosen-chains/evm';

import { BASE_CHAIN, BASE_CHAIN_ID, ETH } from './constants';

class BaseChain extends EvmChain {
  CHAIN = BASE_CHAIN;
  NATIVE_TOKEN_ID = ETH;
  CHAIN_ID = BASE_CHAIN_ID;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: TokenMap,
    signMediator: EvmChainSignMediator,
    logger?: AbstractLogger,
  ) {
    super(network, configs, tokens, signMediator, BASE_CHAIN, ETH, 2, logger);
  }
}

export default BaseChain;
