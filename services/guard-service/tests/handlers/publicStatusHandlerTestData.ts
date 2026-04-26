import { TransactionType } from '@rosen-chains/abstract-chain';

import { TransactionEntity } from '../../src/db/entities/transactionEntity';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';

export const id0 =
  '0000000000000000000000000000000000000000000000000000000000000000';
export const id1 =
  '0000000000000000000000000000000000000000000000000000000000000001';
export const id2 =
  '0000000000000000000000000000000000000000000000000000000000000002';
export const id3 =
  '0000000000000000000000000000000000000000000000000000000000000003';

export const chain = 'chain1';
export const eventId = id0;
export const txId1 = id1;
export const txId2 = id2;
export const mockPk = 'mock-pk';
export const mockSignature = 'mock-signature';
export const signMessage = 'test-sign-message';

export const mockTx: TransactionEntity = {
  txId: txId1,
  chain: 'chain1',
  type: TransactionType.reward,
  status: TransactionStatus.inSign,
  txJson: '',
  lastCheck: 0,
  event: {
    id: eventId,
    eventData: {
      id: 0,
      identifier: '',
      block: '',
      height: 0,
      extractor: '',
      serialized: '',
      eventId,
      txId: id3,
      fromChain: '',
      toChain: '',
      fromAddress: '',
      toAddress: '',
      amount: '',
      bridgeFee: '',
      networkFee: '',
      sourceChainTokenId: '',
      sourceChainHeight: 0,
      targetChainTokenId: '',
      sourceTxId: '',
      sourceBlockId: '',
      WIDsCount: 0,
      WIDsHash: '',
    },
    status: EventStatus.inReward,
    firstTry: '',
    unexpectedFails: 0,
  },
  order: null,
  lastStatusUpdate: '',
  failedInSign: false,
  signFailedCount: 0,
  requiredSign: 0,
};
