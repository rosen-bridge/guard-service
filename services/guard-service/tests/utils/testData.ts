import { EventTrigger } from '@rosen-chains/abstract-chain';

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
  serialized: 'box-serialized',
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

export const mockedEventForCommitment: EventTrigger = {
  fromChain: 'ADA',
  toChain: 'ERG',
  fromAddress: '9i1Jy713XfahaB8oFFm2T9kpM7mzT1F4dMvMZKo7rJPB3U4vNVq',
  toAddress: '9hPZKvu48kKkPAwrhDukwVxmNrTAa1vXdSsbDijXVsEEYaUt3x5',
  amount: '100000',
  bridgeFee: '2520',
  networkFee: '10000000',
  sourceChainTokenId:
    'a5d0d1dd7c9faad78a662b065bf053d7e9b454af446fbd50c3bb2e3ba566e164',
  targetChainTokenId:
    '1db2acc8c356680e21d4d06ce345b83bdf61a89e6b0475768557e06aeb24709f',
  sourceTxId:
    'cb459f7f8189d3524e6b7361b55baa40c34a71ec5ac506628736096c7aa66f1a',
  sourceBlockId:
    '7e3b6c9cf8146cf49c0b255d9a8fbeeeb76bea64345f74edc25f8dfee0473968',
  sourceChainHeight: 1212,
  height: 120000,
  WIDsHash: '02020aa2c82582685925e47d6a274c317694bd17ea33a8c7834241a8ce3f0505',
  WIDsCount: 5,
};
export const WID =
  '245341e0dda895feca93adbd2db9e643a74c50a1b3702db4c2535f23f1c72e6e';
export const expectedCommitment =
  '32d5595a12048a13a7807505b26b11e4eae4c69a0c87c39ff7555600708bd23a';
