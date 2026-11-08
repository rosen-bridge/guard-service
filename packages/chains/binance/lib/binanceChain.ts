import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractEvmNetwork,
  EvmChain,
  EvmConfigs,
  EvmChainSignMediator,
} from '@rosen-chains/evm';

import { BNB, BINANCE_CHAIN, BINANCE_CHAIN_ID } from './constants';

class BinanceChain extends EvmChain {
  CHAIN = BINANCE_CHAIN;
  NATIVE_TOKEN_ID = BNB;
  CHAIN_ID = BINANCE_CHAIN_ID;

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
      BINANCE_CHAIN,
      BNB,
      0,
      logger,
    );
  }
}

export default BinanceChain;
