import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FailedError, UnexpectedApiError } from '@rosen-chains/abstract-chain';

import FiroElectrumXNetwork from '../lib/firoElectrumxNetwork';
import {
  getMockRequests,
  setMockResponses,
  resetMock,
} from './mocked/electrumxSocket.mock';
import * as testData from './testData';

vi.mock('@rosen-bridge/firo-scanner', async (importOriginal) => {
  const ref =
    await importOriginal<typeof import('@rosen-bridge/firo-scanner')>();
  const mock = await import('./mocked/electrumxSocket.mock');
  return { ...ref, ElectrumXSocket: mock.ElectrumXSocket };
});

describe('FiroElectrumXNetwork', () => {
  const HOST = 'address';
  const PORT = 50002;
  const createNetwork = () => new FiroElectrumXNetwork(HOST, PORT);

  beforeEach(() => {
    resetMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHeight', () => {
    /**
     * @target `FiroElectrumXNetwork.getHeight` should return block height successfully
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.headers.subscribe response
     * - create new instance of FiroElectrumXNetwork
     * - call getHeight
     * @expected
     * - it should return mocked block height
     */
    it('should return block height successfully', async () => {
      setMockResponses([testData.blockHeightResponse]);

      const network = createNetwork();
      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeightResponse.height);
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `FiroElectrumXNetwork.getBlockTransactionIds` should return block tx ids
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.block.height and blockchain.block.txids responses
     * @expected
     * - it should return mocked tx ids
     */
    it('should return block tx ids successfully', async () => {
      setMockResponses([testData.blockInfo.height, testData.blockTxIds]);

      const network = createNetwork();
      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockTxIds);
      expect(getMockRequests()).toEqual([
        {
          method: 'blockchain.block.height',
          params: [testData.blockHash],
        },
        {
          method: 'blockchain.block.txids',
          params: [testData.blockInfo.height],
        },
      ]);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `FiroElectrumXNetwork.getBlockInfo` should return block info
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.block.height and blockchain.block.header responses
     * @expected
     * - it should return correct hash, parentHash, and height
     */
    it('should return block info successfully', async () => {
      setMockResponses([
        testData.blockInfo.height, // blockchain.block.height response
        testData.blockHeaderHex, // blockchain.block.header response
      ]);

      const network = createNetwork();
      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
      expect(getMockRequests()).toEqual([
        {
          method: 'blockchain.block.height',
          params: [testData.blockHash],
        },
        {
          method: 'blockchain.block.header',
          params: [testData.blockInfo.height],
        },
      ]);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `FiroElectrumXNetwork.getTransaction` should return transaction
     * @dependencies
     * - tls
     * @scenario
     * - mock ElectrumX blockchain.transaction.get response
     * @expected
     * - it should return parsed FiroTx
     */
    it('should return transaction successfully', async () => {
      setMockResponses([
        { hex: testData.txHex, blockhash: testData.txBlockHash },
      ]);

      const network = createNetwork();
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.firoTx);
    });

    /**
     * @target `FiroElectrumXNetwork.getTransaction` should parse a version 3 Firo transaction with packed type
     * @dependencies
     * - ElectrumXSocket
     * - firo-scanner transaction parser
     * @scenario
     * - mock ElectrumX blockchain.transaction.get response with packed version/type hex
     * @expected
     * - it should return the full parsed FiroTx
     */
    it('should parse a version 3 Firo transaction with packed type', async () => {
      setMockResponses([
        { hex: testData.txHexV3Typed, blockhash: testData.txBlockHash },
      ]);

      const network = createNetwork();
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.firoTx);
    });

    /**
     * @target `FiroElectrumXNetwork.getTransaction` should throw FailedError when transaction is not found
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX to return a not found error
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError when transaction is not found', async () => {
      setMockResponses([{ error: { message: 'not found', code: -1 } }]);

      const network = createNetwork();
      await expect(
        network.getTransaction('not-found', testData.txBlockHash),
      ).rejects.toThrow(FailedError);
    });

    /**
     * @target `FiroElectrumXNetwork.getTransaction` should throw UnexpectedApiError when transaction blockId is wrong
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX to return a transaction from another block
     * @expected
     * - it should throw UnexpectedApiError
     */
    it('should throw UnexpectedApiError when transaction blockId is wrong', async () => {
      setMockResponses([
        { hex: testData.txHex, blockhash: 'wrong-block-hash' },
      ]);

      const network = createNetwork();
      await expect(
        network.getTransaction(testData.txId, testData.txBlockHash),
      ).rejects.toThrow(UnexpectedApiError);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `FiroElectrumXNetwork.isBoxUnspentAndValid` should return true for unspent output
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock transaction hex and listunspent containing the box
     * @expected
     * - it should return true
     */
    it('should return true for unspent output', async () => {
      setMockResponses([testData.txHex, [testData.unspentOutput]]);

      const network = createNetwork();
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(true);
    });

    /**
     * @target `FiroElectrumXNetwork.isBoxUnspentAndValid` should return false for spent output
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock transaction hex but listunspent not containing the box
     * @expected
     * - it should return false
     */
    it('should return false for spent output', async () => {
      setMockResponses([
        testData.txHex,
        [], // empty listunspent means output is spent
      ]);

      const network = createNetwork();
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(false);
    });

    /**
     * @target `FiroElectrumXNetwork.isBoxUnspentAndValid` should return false when tx doesn't exist
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX to return error for non-existent tx
     * @expected
     * - it should return false
     */
    it("should return false when transaction doesn't exist", async () => {
      setMockResponses([
        { error: { message: 'No such transaction', code: -5 } },
      ]);

      const network = createNetwork();
      const result = await network.isBoxUnspentAndValid(`nonexistent.0`);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `FiroElectrumXNetwork.getUtxo` should return UTXO data
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock transaction hex with the requested output
     * @expected
     * - it should return correct UTXO
     */
    it('should return UTXO data successfully', async () => {
      setMockResponses([testData.txHex]);

      const network = createNetwork();
      const result = await network.getUtxo(`${testData.txId}.0`);

      expect(result).toEqual(testData.firoUtxo);
    });

    /**
     * @target `FiroElectrumXNetwork.getUtxo` should throw FailedError for invalid output index
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock transaction hex, request non-existent output index
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError for invalid output index', async () => {
      setMockResponses([testData.txHex]);

      const network = createNetwork();
      await expect(network.getUtxo(`${testData.txId}.999`)).rejects.toThrow(
        FailedError,
      );
    });
  });

  describe('getFeeRatio', () => {
    /**
     * @target `FiroElectrumXNetwork.getFeeRatio` should return fee ratio
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.estimatefee response
     * @expected
     * - it should return calculated fee ratio in satoshis/byte
     */
    it('should return fee ratio successfully', async () => {
      setMockResponses([testData.estimatedFee]);

      const network = createNetwork();
      const result = await network.getFeeRatio();

      // 0.01001657 FIRO/kB = 1001657 sat/kB = 1001.657 sat/byte
      expect(result).toBeCloseTo(1001.657, 10);
    });

    /**
     * @target `FiroElectrumXNetwork.getFeeRatio` should not round up fee rates
     *   that are not exactly representable as floats
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.estimatefee with rates around Firo's default
     *   min relay fee, where `rate * 1e8` carries binary representation error
     * @expected
     * - it should return the exact fee ratio in satoshis/byte, without the
     *   sub-satoshi error being amplified into a whole satoshi per byte
     */
    it.each([
      [testData.lowEstimatedFee, 0.999],
      [testData.minRelayEstimatedFee, 1],
      [testData.doubleMinRelayEstimatedFee, 2],
    ])('should return exact fee ratio for rate %p', async (rate, expected) => {
      setMockResponses([rate]);

      const network = createNetwork();
      const result = await network.getFeeRatio();

      expect(result).toBeCloseTo(expected, 10);
    });

    /**
     * @target `FiroElectrumXNetwork.getFeeRatio` should fall back when the node
     *   cannot estimate a fee
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.estimatefee to return a non-positive rate
     * @expected
     * - it should return the 10 sat/byte fallback
     */
    it.each([0, -1])(
      'should return fallback fee ratio for rate %p',
      async (rate) => {
        setMockResponses([rate]);

        const network = createNetwork();
        const result = await network.getFeeRatio();

        expect(result).toEqual(10);
      },
    );
  });

  describe('isTxInMempool', () => {
    /**
     * @target `FiroElectrumXNetwork.isTxInMempool` should return true when tx is in mempool
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock verbose get to return an existing tx without confirmations
     * @expected
     * - it should return true
     */
    it('should return true when tx is in mempool', async () => {
      setMockResponses([{ hex: testData.txHex }]);

      const network = createNetwork();
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(true);
    });

    /**
     * @target `FiroElectrumXNetwork.isTxInMempool` should return false when tx is confirmed
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock verbose get to return a positive confirmation count
     * @expected
     * - it should return false (not in mempool, it's confirmed)
     */
    it('should return false when tx is confirmed', async () => {
      setMockResponses([
        {
          hex: testData.txHex,
          blockhash: testData.txBlockHash,
          confirmations: 1,
        },
      ]);

      const network = createNetwork();
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });

    /**
     * @target `FiroElectrumXNetwork.isTxInMempool` should return false when tx is not found
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock verbose get to fail
     * @expected
     * - it should return false
     */
    it('should return false when tx is not found', async () => {
      setMockResponses([{ error: { message: 'not found', code: -1 } }]);

      const network = createNetwork();
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });
  });

  describe('getTransactionHex', () => {
    /**
     * @target `FiroElectrumXNetwork.getTransactionHex` should return transaction hex
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX blockchain.transaction.get response
     * @expected
     * - it should return the raw hex string
     */
    it('should return transaction hex successfully', async () => {
      setMockResponses([testData.txHex]);

      const network = createNetwork();
      const result = await network.getTransactionHex(testData.txId);

      expect(result).toEqual(testData.txHex);
    });
  });

  describe('getAddressBoxes', () => {
    /**
     * @target `FiroElectrumXNetwork.getAddressBoxes` should return address UTXOs with pagination
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX listunspent response
     * @expected
     * - it should return paginated UTXOs in correct format
     */
    it('should return address UTXOs successfully with pagination', async () => {
      setMockResponses([testData.mockAddressUtxos]);

      const network = createNetwork();
      const result = await network.getAddressBoxes(testData.lockAddress, 0, 2);

      expect(result).toEqual(testData.expectedAddressBoxes);
    });

    /**
     * @target `FiroElectrumXNetwork.getAddressBoxes` should return empty list for address without UTXOs
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock empty listunspent response
     * @expected
     * - it should return empty array
     */
    it('should return empty list for address without UTXOs', async () => {
      setMockResponses([[]]);

      const network = createNetwork();
      const result = await network.getAddressBoxes(testData.lockAddress, 0, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should return confirmation count
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock verbose get to return Firo Core confirmation count
     * @expected
     * - it should return correct number of confirmations
     */
    it('should return confirmation count successfully', async () => {
      setMockResponses([
        {
          hex: testData.txHex,
          blockhash: testData.txBlockHash,
          confirmations: testData.expectedTxConfirmation,
        },
      ]);

      const network = createNetwork();
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.expectedTxConfirmation);
    });

    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should return -1 for unconfirmed tx
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock verbose get to return an existing tx without confirmations
     * @expected
     * - it should return -1
     */
    it('should return -1 for unconfirmed transaction', async () => {
      setMockResponses([{ hex: testData.txHex }]);

      const network = createNetwork();
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should return -1 when tx not found
     * @dependencies
     * - tls
     * @scenario
     * - mock verbose get to throw
     * @expected
     * - it should return -1
     */
    it('should return -1 when transaction is not found', async () => {
      setMockResponses([
        {
          error: {
            message: `"daemon error: DaemonError({'code': -5, 'message': 'No such mempool or blockchain transaction. Use gettransaction for wallet transactions.'})"`,
            code: 2,
          },
        },
      ]);

      const network = createNetwork();
      const result = await network.getTxConfirmation('nonexistent-tx-id');

      expect(result).toEqual(-1);
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target `FiroElectrumXNetwork.getAddressAssets` should return address balance
     * @dependencies
     * - tls
     * @scenario
     * - mock ElectrumX blockchain.scripthash.get_balance response
     * @expected
     * - it should return native token balance
     */
    it('should return address balance successfully', async () => {
      setMockResponses([testData.balanceResponse]);

      const network = createNetwork();
      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result).toEqual({
        nativeToken: testData.expectedAddressBalance,
        tokens: [],
      });
    });

    /**
     * @target `FiroElectrumXNetwork.getAddressAssets` should return 0 for address without balance
     * @dependencies
     * - tls
     * @scenario
     * - mock zero balance response
     * @expected
     * - it should return 0 balance
     */
    it('should return 0 for address without balance', async () => {
      setMockResponses([{ confirmed: 0, unconfirmed: 0 }]);

      const network = createNetwork();
      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result).toEqual({ nativeToken: 0n, tokens: [] });
    });
  });

  describe('getTransactionSpendingInput', () => {
    const spendingTx = {
      id: 'spending_tx_id',
      inputs: [
        { txId: 'other_tx_id', index: 1, scriptPubKey: '' },
        { txId: testData.txId, index: 0, scriptPubKey: '' },
      ],
      outputs: [],
    };
    const unrelatedTx = {
      id: 'unrelated_tx_id',
      inputs: [{ txId: testData.txId, index: 1, scriptPubKey: '' }],
      outputs: [],
    };

    /**
     * @target `FiroElectrumXNetwork.getTransactionSpendingInput` should return
     * the transaction spending the output
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX transaction hex and output script history responses
     * - mock getTransaction to return history transactions
     * - run test
     * - check returned value and requests
     * @expected
     * - it should return the transaction which spends the output
     * - it should not fetch the transaction containing the output itself
     */
    it('should return the transaction spending the output', async () => {
      setMockResponses([
        testData.txHex,
        [
          { tx_hash: testData.txId, height: 100 },
          { tx_hash: unrelatedTx.id, height: 101 },
          { tx_hash: spendingTx.id, height: 0 },
        ],
      ]);
      const network = createNetwork();
      const getTransactionSpy = vi
        .spyOn(network, 'getTransaction')
        .mockImplementation(async (txId: string) =>
          txId === spendingTx.id ? spendingTx : unrelatedTx,
        );

      const result = await network.getTransactionSpendingInput(
        0,
        testData.txId,
      );

      expect(result).toEqual(spendingTx);
      expect(getTransactionSpy).toHaveBeenCalledTimes(2);
      expect(getTransactionSpy).not.toHaveBeenCalledWith(testData.txId, '');
      expect(getMockRequests().map((request) => request.method)).toEqual([
        'blockchain.transaction.get',
        'blockchain.scripthash.get_history',
      ]);
    });

    /**
     * @target `FiroElectrumXNetwork.getTransactionSpendingInput` should return
     * undefined when no transaction spends the output
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX transaction hex and output script history responses
     * - mock getTransaction to return a tx which does not spend the output
     * - run test
     * - check returned value
     * @expected
     * - it should return undefined
     */
    it('should return undefined when no transaction spends the output', async () => {
      setMockResponses([
        testData.txHex,
        [
          { tx_hash: testData.txId, height: 100 },
          { tx_hash: unrelatedTx.id, height: 101 },
        ],
      ]);
      const network = createNetwork();
      vi.spyOn(network, 'getTransaction').mockResolvedValue(unrelatedTx);

      const result = await network.getTransactionSpendingInput(
        0,
        testData.txId,
      );

      expect(result).toBeUndefined();
    });

    /**
     * @target `FiroElectrumXNetwork.getTransactionSpendingInput` should return
     * undefined when the output does not exist
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX transaction hex response
     * - run test with an out of range output index
     * - check returned value and requests
     * @expected
     * - it should return undefined
     * - it should not request the output script history
     */
    it('should return undefined when the output does not exist', async () => {
      setMockResponses([testData.txHex]);
      const network = createNetwork();

      const result = await network.getTransactionSpendingInput(
        testData.firoTx.outputs.length,
        testData.txId,
      );

      expect(result).toBeUndefined();
      expect(getMockRequests().map((request) => request.method)).toEqual([
        'blockchain.transaction.get',
      ]);
    });
  });
});
