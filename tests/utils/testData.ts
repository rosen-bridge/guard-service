import { RevenueEntity } from '../../src/db/entities/revenueEntity';
import { RevenueView } from '../../src/db/entities/revenueView';
import { RevenueHistory } from '../../src/types/api';
import { RevenueType } from '../../src/utils/constants';

export const mockedView: Array<RevenueView> = [
  {
    id: 183,
    rewardTxId:
      '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
    eventId: 'a98d6cc7749e7f915f5a0373ecb5b97c2eec5164678d9e74ccc98f2f4bde77b1',
    lockHeight: 13000,
    fromChain: 'cardano',
    toChain: 'ergo',
    fromAddress: 'fromAddress',
    toAddress: 'toAddress',
    amount: '50000000000',
    bridgeFee: '1000000000',
    networkFee: '1500000',
    lockTokenId:
      'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59',
    lockTxId:
      '2d564e25a63a01f5e25f4221f1f6b589f012bac8a5d8670271adcc51176cd602',
    height: 1009,
    timestamp: 1669672400000,
  },
];

export const eventData = {
  id: 183,
  eventId: 'a98d6cc7749e7f915f5a0373ecb5b97c2eec5164678d9e74ccc98f2f4bde77b1',
  txId: 'event-creation-tx-id',
  extractor: 'extractor',
  boxId: '1f2fad80063525dbb2660429be4bbcbcf8eb965cbdc63de1eab118991786c4fa',
  boxSerialized: 'box-serialized',
  block: 'blockId',
  height: 12000,
  fromChain: 'cardano',
  toChain: 'ergo',
  fromAddress: 'fromAddress',
  toAddress: 'toAddress',
  amount: '50000000000',
  bridgeFee: '1000000000',
  networkFee: '1500000',
  sourceChainTokenId:
    'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59',
  sourceChainHeight: 20000,
  targetChainTokenId:
    'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
  sourceTxId:
    '2d564e25a63a01f5e25f4221f1f6b589f012bac8a5d8670271adcc51176cd602',
  sourceBlockId: '',
  WIDsHash: '02020aa2c82582685925e47d6a274c317694bd17ea33a8c7834241a8ce3f0505',
  WIDsCount: 5,
  spendBlock:
    'e2d9d21074da79af6cc0097f7ad1bc11f81f574c0c5da7f58602821f71868cd1',
  spendHeight: 13000,
  spendTxId: '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
};

export const mockedEntities: Array<RevenueEntity> = [
  {
    id: 11,
    tokenId: 'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
    amount: 10000n,
    txId: '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
    revenueType: RevenueType.fraud,
    eventData: eventData,
  },
  {
    id: 12,
    tokenId: 'erg',
    amount: 100000000n,
    txId: '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
    revenueType: RevenueType.fraud,
    eventData: eventData,
  },
];

export const revenueHistory: Array<RevenueHistory> = [
  {
    rewardTxId:
      '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
    eventId: 'a98d6cc7749e7f915f5a0373ecb5b97c2eec5164678d9e74ccc98f2f4bde77b1',
    lockHeight: 13000,
    fromChain: 'cardano',
    toChain: 'ergo',
    fromAddress: 'fromAddress',
    toAddress: 'toAddress',
    bridgeFee: '1000000000',
    networkFee: '1500000',
    lockToken: {
      tokenId:
        'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59',
      amount: 50000000000,
      name: 'Hosky',
      decimals: 0,
      isNativeToken: false,
    },
    lockTxId:
      '2d564e25a63a01f5e25f4221f1f6b589f012bac8a5d8670271adcc51176cd602',
    height: 1009,
    timestamp: 1669672400000,
    ergoSideTokenId:
      'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
    revenues: [
      {
        revenueType: RevenueType.fraud,
        data: {
          tokenId:
            'b37bfa41c2d9e61b4e478ddfc459a03d25b658a2305ffb428fbc47ad6abbeeaa',
          amount: 10000,
          name: 'RstHoskyVTest2',
          decimals: 0,
          isNativeToken: false,
        },
      },
      {
        revenueType: RevenueType.fraud,
        data: {
          tokenId: 'erg',
          amount: 100000000,
          name: 'erg',
          decimals: 9,
          isNativeToken: true,
        },
      },
    ],
  },
];
