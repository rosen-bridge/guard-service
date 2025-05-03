import { describe, expect, it } from 'vitest';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';
import PartialDogeNetwork from '../../lib/network/PartialDogeNetwork';
import CombinedDogeNetwork from '../../lib/network/CombinedDogeNetwork';
import DogeNetworkFunction from '../../lib/network/DogeNetworkFunctions';
import { DogeTx, DogeUtxo } from '../../lib/types';

/**
 * A test implementation of PartialDogeNetwork that only implements height and assets
 */
class HeightAndAssetsNetwork extends PartialDogeNetwork {
  readonly implements = [
    DogeNetworkFunction.getHeight,
    DogeNetworkFunction.getAddressAssets,
  ];

  mockHeight = 123456;
  mockAssets = {
    nativeToken: 1000n,
    tokens: [],
  };

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  getHeight = async (): Promise<number> => {
    return this.mockHeight;
  };

  getAddressAssets = async (_address: string): Promise<AssetBalance> => {
    return this.mockAssets;
  };
}

/**
 * A test implementation of PartialDogeNetwork that only implements transaction functions
 */
class TransactionNetwork extends PartialDogeNetwork {
  readonly implements = [
    DogeNetworkFunction.getTransaction,
    DogeNetworkFunction.submitTransaction,
    DogeNetworkFunction.getTxConfirmation,
    DogeNetworkFunction.getTransactionHex,
  ];

  mockTx: DogeTx = {
    id: 'tx123',
    inputs: [],
    outputs: [],
  };
  mockConfirmation = 10;
  mockTxHex = '1234abcd';

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  getTransaction = async (_txId: string, _blockId: string): Promise<DogeTx> => {
    return this.mockTx;
  };

  submitTransaction = async (_transaction: Psbt): Promise<void> => {
    // Do nothing in test
  };

  getTxConfirmation = async (_txId: string): Promise<number> => {
    return this.mockConfirmation;
  };

  getTransactionHex = async (_txId: string): Promise<string> => {
    return this.mockTxHex;
  };
}

/**
 * A test implementation of PartialDogeNetwork that only implements block and utxo functions
 */
class BlockAndUtxoNetwork extends PartialDogeNetwork {
  readonly implements = [
    DogeNetworkFunction.getBlockInfo,
    DogeNetworkFunction.getBlockTransactionIds,
    DogeNetworkFunction.getAddressBoxes,
    DogeNetworkFunction.isBoxUnspentAndValid,
    DogeNetworkFunction.getUtxo,
    DogeNetworkFunction.getFeeRatio,
    DogeNetworkFunction.isTxInMempool,
    DogeNetworkFunction.getMempoolTransactions,
  ];

  mockBlockInfo: BlockInfo = {
    hash: 'block123',
    parentHash: 'block122',
    height: 123456,
  };
  mockBlockTxIds = ['tx1', 'tx2'];
  mockUtxos: DogeUtxo[] = [
    {
      txId: 'tx1',
      index: 0,
      value: 100n,
    },
  ];
  mockFeeRatio = 0.5;

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  getBlockInfo = async (_blockId: string): Promise<BlockInfo> => {
    return this.mockBlockInfo;
  };

  getBlockTransactionIds = async (_blockId: string): Promise<Array<string>> => {
    return this.mockBlockTxIds;
  };

  getAddressBoxes = async (
    _address: string,
    _offset: number,
    _limit: number
  ): Promise<Array<DogeUtxo>> => {
    return this.mockUtxos;
  };

  isBoxUnspentAndValid = async (_boxId: string): Promise<boolean> => {
    return true;
  };

  getUtxo = async (_boxId: string): Promise<DogeUtxo> => {
    return this.mockUtxos[0];
  };

  getFeeRatio = async (): Promise<number> => {
    return this.mockFeeRatio;
  };

  isTxInMempool = async (_txId: string): Promise<boolean> => {
    return false;
  };

  getMempoolTransactions = async (): Promise<Array<DogeTx>> => {
    return [];
  };
}

/**
 * A complete implementation of PartialDogeNetwork that implements all functions
 * Used for testing priority
 */
class CompleteDogeNetwork extends PartialDogeNetwork {
  readonly implements = Object.values(
    DogeNetworkFunction
  ) as DogeNetworkFunction[];

  mockHeight = 100;
  mockAssets = { nativeToken: 1000n, tokens: [] };
  mockTx: DogeTx = { id: 'tx123', inputs: [], outputs: [] };
  mockConfirmation = 10;
  mockTxHex = '1234abcd';
  mockBlockInfo: BlockInfo = {
    hash: 'block123',
    parentHash: 'block122',
    height: 123456,
  };
  mockBlockTxIds = ['tx1', 'tx2'];
  mockUtxos: DogeUtxo[] = [{ txId: 'tx1', index: 0, value: 100n }];
  mockFeeRatio = 0.5;

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  getHeight = async (): Promise<number> => {
    return this.mockHeight;
  };

  getAddressAssets = async (_address: string): Promise<AssetBalance> => {
    return this.mockAssets;
  };

  getTransaction = async (_txId: string, _blockId: string): Promise<DogeTx> => {
    return this.mockTx;
  };

  submitTransaction = async (_transaction: Psbt): Promise<void> => {
    // Do nothing in test
  };

  getTxConfirmation = async (_txId: string): Promise<number> => {
    return this.mockConfirmation;
  };

  getTransactionHex = async (_txId: string): Promise<string> => {
    return this.mockTxHex;
  };

  getBlockInfo = async (_blockId: string): Promise<BlockInfo> => {
    return this.mockBlockInfo;
  };

  getBlockTransactionIds = async (_blockId: string): Promise<Array<string>> => {
    return this.mockBlockTxIds;
  };

  getAddressBoxes = async (
    _address: string,
    _offset: number,
    _limit: number
  ): Promise<Array<DogeUtxo>> => {
    return this.mockUtxos;
  };

  isBoxUnspentAndValid = async (_boxId: string): Promise<boolean> => {
    return true;
  };

  getUtxo = async (_boxId: string): Promise<DogeUtxo> => {
    return this.mockUtxos[0];
  };

  getFeeRatio = async (): Promise<number> => {
    return this.mockFeeRatio;
  };

  isTxInMempool = async (_txId: string): Promise<boolean> => {
    return false;
  };

  getMempoolTransactions = async (): Promise<Array<DogeTx>> => {
    return [];
  };
}

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
