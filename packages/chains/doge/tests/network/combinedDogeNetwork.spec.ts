import { DummyLogger } from '@rosen-bridge/abstract-logger';
import { describe, expect, it } from 'vitest';

import CombinedDogeNetwork from '../../lib/network/combinedDogeNetwork';
import { BlockAndUtxoNetwork } from './blockAndUtxoNetwork';
import { CompleteDogeNetwork } from './completeDogeNetwork';
import { HeightAndAssetsNetwork } from './heightAndAssetsNetwork';
import { TransactionNetwork } from './transactionNetwork';

describe('CombinedDogeNetwork', () => {
  const logger = new DummyLogger();

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
      logger,
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
      logger,
    );
    const height1 = await combinedNetwork1.getHeight();
    expect(height1).toBe(100);

    // When network2 has priority
    const combinedNetwork2 = new CombinedDogeNetwork(
      [network2, network1],
      logger,
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
    const networks = [network1, network2];

    // Missing BlockAndUtxoNetwork functions
    expect(() => {
      new CombinedDogeNetwork(networks, logger);
    }).toThrow(/The following functions have no implementation/);
  });
});
