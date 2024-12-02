import { RosenTokens } from '@rosen-bridge/tokens';
import { AbstractEvmNetwork, EvmChain, TssSignFunction } from '../lib';

class TestChain extends EvmChain {
  CHAIN = 'test';
  NATIVE_TOKEN_ID = 'test-native-token';
  CHAIN_ID = 1n;

  constructor(
    network: AbstractEvmNetwork,
    configs: any,
    tokens: RosenTokens,
    supportedTokens: Array<string>,
    signFunction: TssSignFunction,
    evmTxType: number
  ) {
    super(
      network,
      configs,
      tokens,
      supportedTokens,
      signFunction,
      'test',
      'test-native-token',
      evmTxType
    );
  }
}

export default TestChain;
