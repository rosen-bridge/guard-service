import { DataSource } from '@rosen-bridge/extended-typeorm';
import { TokenMap } from '@rosen-bridge/tokens';

import { AbstractEvmNetwork, EvmChain, EvmChainSignMediator } from '../lib';

class TestChain extends EvmChain {
  CHAIN = 'test';
  NATIVE_TOKEN_ID = 'test-native-token';
  CHAIN_ID = 1n;

  callGetTxConfirmation = (txId: string) => this.getTxConfirmation(txId);

  constructor(
    network: AbstractEvmNetwork,
    configs: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    tokens: TokenMap,
    signMediator: EvmChainSignMediator,
    dataSource: DataSource,
    evmTxType: number,
  ) {
    super(
      network,
      configs,
      tokens,
      signMediator,
      dataSource,
      'test',
      'test-native-token',
      evmTxType,
    );
  }
}

export default TestChain;
