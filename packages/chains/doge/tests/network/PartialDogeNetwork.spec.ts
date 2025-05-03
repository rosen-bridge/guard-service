import { describe, expect, it } from 'vitest';
import { DogeNetworkFunction } from '../../lib/types';
import { HeightAndAssetsNetwork } from './mocks';

describe('PartialDogeNetwork', () => {
  /**
   * @target PartialDogeNetwork should implement only specified functions
   * @dependencies
   * @scenario
   * - create instance of HeightAndAssetsNetwork
   * - try to call implemented and non-implemented functions
   * @expected
   * - implemented functions should return mock values
   * - non-implemented functions should throw errors
   */
  it('should implement only specified functions', async () => {
    const network = new HeightAndAssetsNetwork();

    // Test implemented functions
    const height = await network.getHeight();
    expect(height).toBe(123456);

    const assets = await network.getAddressAssets('addr1');
    expect(assets).toEqual({
      nativeToken: 1000n,
      tokens: [],
    });

    // Test non-implemented functions
    await expect(network.getTransaction('txId', 'blockId')).rejects.toThrow(
      'Function [getTransaction] is not implemented'
    );
    await expect(network.getBlockInfo('blockId')).rejects.toThrow(
      'Function [getBlockInfo] is not implemented'
    );
  });
});

describe('DogeNetworkFunction', () => {
  /**
   * @target DogeNetworkFunction should contain all required functions
   * @dependencies
   * @scenario
   * - check DogeNetworkFunction values
   * @expected
   * - all expected functions should be present
   */
  it('should contain all required functions', () => {
    const expectedFunctions = [
      'getHeight',
      'getTxConfirmation',
      'getAddressAssets',
      'getBlockTransactionIds',
      'getBlockInfo',
      'getTransaction',
      'submitTransaction',
      'getMempoolTransactions',
      'getAddressBoxes',
      'isBoxUnspentAndValid',
      'getUtxo',
      'getFeeRatio',
      'isTxInMempool',
      'getTransactionHex',
    ];

    const actualFunctions = Object.values(DogeNetworkFunction);

    expectedFunctions.forEach((func) => {
      expect(actualFunctions).toContain(func);
    });

    expect(actualFunctions.length).toBe(expectedFunctions.length);
  });
});
