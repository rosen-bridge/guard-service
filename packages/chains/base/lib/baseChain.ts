import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  EvmChain,
  EvmConfigs,
  EvmChainSignMediator,
  AbstractEvmNetwork,
} from '@rosen-chains/evm';

import { BASE_ETH, BASE_CHAIN, BASE_CHAIN_ID } from './constants';

class BaseChain extends EvmChain {
  CHAIN = BASE_CHAIN;
  NATIVE_TOKEN_ID = BASE_ETH;
  CHAIN_ID = BASE_CHAIN_ID;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: TokenMap,
    signMediator: EvmChainSignMediator,
    dataSource: DataSource,
    logger?: AbstractLogger,
  ) {
    super(
      network,
      configs,
      tokens,
      signMediator,
      dataSource,
      BASE_CHAIN,
      BASE_ETH,
      2,
      logger,
    );
  }
}

export default BaseChain;
