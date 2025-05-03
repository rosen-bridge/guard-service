import { describe, expect, it } from 'vitest';
import { DummyLogger } from '@rosen-bridge/abstract-logger';
import CombinedDogeNetwork from '../../lib/network/CombinedDogeNetwork';
import {
  HeightAndAssetsNetwork,
  TransactionNetwork,
  BlockAndUtxoNetwork,
  CompleteDogeNetwork,
} from './mocks';

describe('CombinedDogeNetwork', () => {
  /**
   * @target CombinedDogeNetwork should delegate calls to appropriate network
   * @dependencies
   * @scenario
   * - create instances of partial networks
   * - create CombinedDogeNetwork with these networks
   * - call various functions
   * @expected
   * - each function should be delegated to correct network
   */
  it('should delegate calls to appropriate network', async () => {
    const heightAndAssetsNetwork = new HeightAndAssetsNetwork();
    const transactionNetwork = new TransactionNetwork();
    const blockAndUtxoNetwork = new BlockAndUtxoNetwork();

    const combinedNetwork = new CombinedDogeNetwork(
      [heightAndAssetsNetwork, transactionNetwork, blockAndUtxoNetwork],
      new DummyLogger()
    );

    // Test functions from HeightAndAssetsNetwork
    const height = await combinedNetwork.getHeight();
    expect(height).toBe(heightAndAssetsNetwork.mockHeight);

    const assets = await combinedNetwork.getAddressAssets('addr1');
    expect(assets).toEqual(heightAndAssetsNetwork.mockAssets);

    // Test functions from TransactionNetwork
    const tx = await combinedNetwork.getTransaction('txId', 'blockId');
    expect(tx).toEqual(transactionNetwork.mockTx);

    const confirmation = await combinedNetwork.getTxConfirmation('txId');
    expect(confirmation).toBe(transactionNetwork.mockConfirmation);

    const txHex = await combinedNetwork.getTransactionHex('txId');
    expect(txHex).toBe(transactionNetwork.mockTxHex);

    // Test functions from BlockAndUtxoNetwork
    const blockInfo = await combinedNetwork.getBlockInfo('blockId');
    expect(blockInfo).toEqual(blockAndUtxoNetwork.mockBlockInfo);

    const txIds = await combinedNetwork.getBlockTransactionIds('blockId');
    expect(txIds).toEqual(blockAndUtxoNetwork.mockBlockTxIds);

    const boxes = await combinedNetwork.getAddressBoxes('addr1', 0, 10);
    expect(boxes).toEqual(blockAndUtxoNetwork.mockUtxos);

    const feeRatio = await combinedNetwork.getFeeRatio();
    expect(feeRatio).toBe(blockAndUtxoNetwork.mockFeeRatio);
  });

  /**
   * @target CombinedDogeNetwork should respect priority order
   * @dependencies
   * @scenario
   * - create two complete networks with different getHeight values
   * - create CombinedDogeNetwork with these networks in different orders
   * - call the getHeight function
   * @expected
   * - function should be delegated based on priority order
   */
  it('should respect priority order', async () => {
    const network1 = new CompleteDogeNetwork();
    network1.mockHeight = 100;

    const network2 = new CompleteDogeNetwork();
    network2.mockHeight = 200;

    // When network1 has priority
    const combinedNetwork1 = new CombinedDogeNetwork(
      [network1, network2],
      new DummyLogger()
    );
    const height1 = await combinedNetwork1.getHeight();
    expect(height1).toBe(100);

    // When network2 has priority
    const combinedNetwork2 = new CombinedDogeNetwork(
      [network2, network1],
      new DummyLogger()
    );
    const height2 = await combinedNetwork2.getHeight();
    expect(height2).toBe(200);
  });

  /**
   * @target CombinedDogeNetwork should validate completeness
   * @dependencies
   * @scenario
   * - create network implementations missing some functions
   * - try to create CombinedDogeNetwork with these networks
   * @expected
   * - constructor should throw error listing missing functions
   */
  it('should validate completeness', () => {
    const network1 = new HeightAndAssetsNetwork();
    const network2 = new TransactionNetwork();

    // Missing BlockAndUtxoNetwork functions
    expect(() => {
      new CombinedDogeNetwork([network1, network2], new DummyLogger());
    }).toThrow(/The following functions have no implementation/);
  });

  /**
   * @target CombinedDogeNetwork should throw error when functions are missing
   * @dependencies
   * @scenario
   * - create different combinations of network implementations with missing functions
   * - try to create CombinedDogeNetwork with these networks
   * @expected
   * - constructor should throw error for each incomplete combination
   */
  it('should throw error when functions are missing', () => {
    // Test case 1: Only HeightAndAssetsNetwork - missing transaction and block functions
    expect(() => {
      new CombinedDogeNetwork(
        [new HeightAndAssetsNetwork()],
        new DummyLogger()
      );
    }).toThrow(/The following functions have no implementation/);

    // Test case 2: HeightAndAssetsNetwork + TransactionNetwork - missing block functions
    expect(() => {
      new CombinedDogeNetwork(
        [new HeightAndAssetsNetwork(), new TransactionNetwork()],
        new DummyLogger()
      );
    }).toThrow(/The following functions have no implementation/);

    // Test case 3: Only BlockAndUtxoNetwork - missing height, assets, and transaction functions
    expect(() => {
      new CombinedDogeNetwork([new BlockAndUtxoNetwork()], new DummyLogger());
    }).toThrow(/The following functions have no implementation/);

    // Test case 4: Completely empty array - all functions missing
    expect(() => {
      new CombinedDogeNetwork([], new DummyLogger());
    }).toThrow(/The following functions have no implementation/);
  });
});
