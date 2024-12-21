import {
  AbstractEvmNetwork,
  EvmChain,
  EvmConfigs,
  TssSignFunction,
} from '@rosen-chains/evm';
import { TokenMap } from '@rosen-bridge/tokens';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { BNB, BINANCE_CHAIN, BINANCE_CHAIN_ID } from './constants';

class BinanceChain extends EvmChain {
  CHAIN = BINANCE_CHAIN;
  NATIVE_TOKEN_ID = BNB;
  CHAIN_ID = BINANCE_CHAIN_ID;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: TokenMap,
    signFunction: TssSignFunction,
    logger?: AbstractLogger,
    supportedTokens: Array<string> = []
  ) {
    super(
      network,
      configs,
      tokens,
      signFunction,
      BINANCE_CHAIN,
      BNB,
      0,
      logger,
      supportedTokens
    );
  }
}

export default BinanceChain;
