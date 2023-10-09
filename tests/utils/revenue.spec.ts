import { RevenueEntity } from '../../src/db/entities/revenueEntity';
import { RevenueView } from '../../src/db/entities/revenueView';
import { RevenueHistory } from '../../src/types/api';
import { RevenueType } from '../../src/utils/constants';
import { extractRevenueFromView } from '../../src/utils/revenue';

describe('extractRevenueFromView', () => {
  const mockedView: Array<RevenueView> = [
    {
      id: 183,
      rewardTxId:
        '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
      eventId:
        'a98d6cc7749e7f915f5a0373ecb5b97c2eec5164678d9e74ccc98f2f4bde77b1',
      lockHeight: 13000,
      fromChain: 'fromChain',
      toChain: 'toChain',
      fromAddress: 'fromAddress',
      toAddress: 'toAddress',
      amount: '50000000000',
      bridgeFee: '1000000000',
      networkFee: '1500000',
      lockTokenId: 'sourceToken',
      lockTxId:
        '2d564e25a63a01f5e25f4221f1f6b589f012bac8a5d8670271adcc51176cd602',
      height: 1009,
      timestamp: 1669672400000,
    },
  ];

  const eventData = {
    id: 183,
    eventId: 'a98d6cc7749e7f915f5a0373ecb5b97c2eec5164678d9e74ccc98f2f4bde77b1',
    txId: 'event-creation-tx-id',
    extractor: 'extractor',
    boxId: '1f2fad80063525dbb2660429be4bbcbcf8eb965cbdc63de1eab118991786c4fa',
    boxSerialized: 'box-serialized',
    block: 'blockId',
    height: 12000,
    fromChain: 'fromChain',
    toChain: 'toChain',
    fromAddress: 'fromAddress',
    toAddress: 'toAddress',
    amount: '50000000000',
    bridgeFee: '1000000000',
    networkFee: '1500000',
    sourceChainTokenId: 'sourceToken',
    sourceChainHeight: 20000,
    targetChainTokenId: 'targetToken',
    sourceTxId:
      '2d564e25a63a01f5e25f4221f1f6b589f012bac8a5d8670271adcc51176cd602',
    sourceBlockId: '',
    WIDs: '450c09eefeff63085416785a2b6e09ca7564d5a9802e138bc091009bfa8652dc,7ea5f96bc984ca1e90267b9b43933eedcf4b7af6c948155eef0baec6d7e91259,9d08b450337912e5be52cfa9ed72ecc64bd7ee8772292a252cf7db4b00398dbf,b97ed0d596bf00b34c3ac7d57bf979b1bffec2c240b03e05beccb4105cca16fd,5afb7f7c97a5d878ed6a9acd92c7ed5caecda2f0a2241d8e81315576c767e6f1',
    spendBlock:
      'e2d9d21074da79af6cc0097f7ad1bc11f81f574c0c5da7f58602821f71868cd1',
    spendHeight: 13000,
    spendTxId:
      '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
  };

  const mockedEntities: Array<RevenueEntity> = [
    {
      id: 11,
      tokenId: 'tokenId',
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

  const revenueHistory: Array<RevenueHistory> = [
    {
      id: 183,
      rewardTxId:
        '9ac6dd1e7868e2d95210e29a7db15f6cdf18138c6846b1687da0e66d4429be39',
      eventId:
        'a98d6cc7749e7f915f5a0373ecb5b97c2eec5164678d9e74ccc98f2f4bde77b1',
      lockHeight: 13000,
      fromChain: 'fromChain',
      toChain: 'toChain',
      fromAddress: 'fromAddress',
      toAddress: 'toAddress',
      amount: '50000000000',
      bridgeFee: '1000000000',
      networkFee: '1500000',
      lockTokenId: 'sourceToken',
      lockTxId:
        '2d564e25a63a01f5e25f4221f1f6b589f012bac8a5d8670271adcc51176cd602',
      height: 1009,
      timestamp: 1669672400000,
      revenues: [
        {
          revenueType: RevenueType.fraud,
          data: {
            tokenId: 'tokenId',
            amount: 10000,
            name: 'Unsupported token',
            decimals: 0,
          },
        },
        {
          revenueType: RevenueType.fraud,
          data: {
            tokenId: 'erg',
            amount: 100000000,
            name: 'erg',
            decimals: 9,
          },
        },
      ],
    },
  ];

  /**
   * @target extractRevenueFromView should concat revenues for
   * every events with token name and decimals successfully
   * @dependencies
   * @scenario
   * - mock test data
   * - run test
   * - check returned value
   * @expected
   * - expected RevenueHistory object should be returned
   */
  it('should concat revenues for every events with token name and decimals successfully', async () => {
    const result = await extractRevenueFromView(mockedView, mockedEntities);
    expect(result).toEqual(revenueHistory);
  });
});
