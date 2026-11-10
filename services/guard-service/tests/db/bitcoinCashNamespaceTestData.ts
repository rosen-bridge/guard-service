import type { EventTrigger } from '@rosen-chains/abstract-chain';

/** Synthetic trigger fields shared by source-namespace database cases. */
export const namespaceEventData: EventTrigger = {
  height: 200,
  fromChain: 'bitcoin-cash',
  toChain: 'ergo',
  fromAddress: 'source-address',
  toAddress: 'target-address',
  amount: '1000000',
  bridgeFee: '3',
  networkFee: '4',
  sourceChainTokenId: 'source-token',
  targetChainTokenId: 'target-token',
  sourceTxId: '22'.repeat(32),
  sourceChainHeight: 101,
  sourceBlockId: '33'.repeat(32),
  WIDsHash: '44'.repeat(32),
  WIDsCount: 1,
};
