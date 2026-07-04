import { Psbt } from 'bitcoinjs-lib';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  FailedError,
  PaymentTransaction,
  TransactionType,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';

import FiroElectrumXNetwork from '../lib/firoElectrumxNetwork';
import {
  getMockRequests,
  setMockResponses,
  resetMock,
} from './mocked/electrumxSocket.mock';
import * as testData from './testData';

vi.mock('@rosen-bridge/firo-scanner/dist/network/electrumXSocket', async () => {
  const mock = await import('./mocked/electrumxSocket.mock');
  return { ElectrumXSocket: mock.ElectrumXSocket };
});

describe('FiroElectrumXNetwork', () => {
  const HOST = '127.0.0.1';
  const PORT = 50002;
  const mockGetSavedTransactionById = vi.fn().mockReturnValue(undefined);
  const createNetwork = () =>
    new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);

  beforeEach(() => {
    resetMock();
    mockGetSavedTransactionById.mockReset();
    mockGetSavedTransactionById.mockReturnValue(undefined);
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

    /**
     * @target `FiroElectrumXNetwork.getHeight` should wrap ElectrumX object errors as UnexpectedApiError
     * @dependencies
     * - ElectrumXSocket
     * @scenario
     * - mock ElectrumX to return a retryable internal error object
     * @expected
     * - it should throw UnexpectedApiError
     */
    it('should wrap ElectrumX object errors as UnexpectedApiError', async () => {
      setMockResponses([
        { error: { message: 'internal error', code: -32603 } },
      ]);

      const network = createNetwork();
      await expect(network.getHeight()).rejects.toThrow(UnexpectedApiError);
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

      const expectedFeeRate = Math.ceil(
        Math.ceil(testData.estimatedFee * 100000000) / 1000,
      );
      expect(result).toEqual(expectedFeeRate);
    });
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
      setMockResponses([{ error: { message: 'not found', code: -1 } }]);

      const network = createNetwork();
      const result = await network.getTxConfirmation('nonexistent-tx-id');

      expect(result).toEqual(-1);
    });

    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should handle tx with unsigned hash
     * @dependencies
     * - tls, bitcoinjs-lib Psbt
     * @scenario
     * - create custom getSavedTransactionById returning a payment tx
     * - mock bitcoinjs-lib Psbt.fromBuffer to return a finalized transaction id
     * - mock verbose get confirmation response
     * @expected
     * - it should resolve unsigned hash and return confirmations
     */
    it('should fetch confirmation using unsigned hash successfully', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroElectrumXNetwork(
        HOST,
        PORT,
        async (txId: string) => {
          if (txId === testData.unsignedTxId) {
            return firoPayment;
          }
          return undefined;
        },
      );

      vi.spyOn(Psbt, 'fromBuffer').mockReturnValue({
        extractTransaction: vi.fn().mockReturnValue({
          getId: vi.fn().mockReturnValue(testData.txId),
        }),
      } as unknown as Psbt);

      const getTxConfirmationSignedSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customNetwork as any,
        'getTxConfirmationSigned',
      );

      setMockResponses([
        {
          hex: testData.txHex,
          blockhash: testData.txBlockHash,
          confirmations: testData.expectedTxConfirmation,
        },
      ]);

      const result = await customNetwork.getTxConfirmation(
        testData.unsignedTxId,
      );

      expect(getTxConfirmationSignedSpy).toHaveBeenCalledExactlyOnceWith(
        testData.txId,
      );
      expect(result).toEqual(testData.expectedTxConfirmation);
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

  describe('getActualTxId', () => {
    /**
     * @target `FiroElectrumXNetwork.getActualTxId` should return same hash when no saved tx
     * @dependencies
     * - none
     * @scenario
     * - call getActualTxId with hash, no saved tx in DB
     * @expected
     * - it should return the same hash
     */
    it('should return the same hash when no saved transaction exists', async () => {
      const network = createNetwork();
      const result = await network.getActualTxId(testData.txId);

      expect(result).toEqual(testData.txId);
    });

    /**
     * @target `FiroElectrumXNetwork.getActualTxId` should extract signed txId from PSBT
     * @dependencies
     * - bitcoinjs-lib Psbt
     * @scenario
     * - create custom getSavedTransactionById returning payment tx
     * - mock bitcoinjs-lib Psbt.fromBuffer to return a finalized transaction id
     * @expected
     * - it should return signed txId
     */
    it('should extract signed txId from PSBT', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroElectrumXNetwork(
        HOST,
        PORT,
        async (txId: string) => {
          if (txId === testData.unsignedTxId) {
            return firoPayment;
          }
          return undefined;
        },
      );

      const fromBufferSpy = vi.spyOn(Psbt, 'fromBuffer').mockReturnValue({
        extractTransaction: vi.fn().mockReturnValue({
          getId: vi.fn().mockReturnValue(testData.txId),
        }),
      } as unknown as Psbt);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(fromBufferSpy).toHaveBeenCalledWith(
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        expect.objectContaining({ network: expect.any(Object) }),
      );
      expect(result).toEqual(testData.txId);
    });

    /**
     * @target `FiroElectrumXNetwork.getActualTxId` should use spent tx when PSBT is not finalized
     * @dependencies
     * - bitcoinjs-lib Psbt
     * @scenario
     * - create custom getSavedTransactionById returning an unfinalized payment tx
     * - mock spent transaction lookup to return matching signed transaction
     * @expected
     * - it should return the matching signed tx id
     */
    it('should use spent tx when PSBT is not finalized', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroElectrumXNetwork(
        HOST,
        PORT,
        async (txId: string) => {
          if (txId === testData.unsignedTxId) {
            return firoPayment;
          }
          return undefined;
        },
      );

      vi.spyOn(Psbt, 'fromBuffer').mockReturnValue({
        extractTransaction: vi.fn().mockImplementation(() => {
          throw new Error('Not finalized');
        }),
        txInputs: [
          {
            index: 0,
            hash: Buffer.from(testData.firoTx.inputs[0]!.txId, 'hex').reverse(),
          },
        ],
        txOutputs: testData.firoTx.outputs.map((output) => ({
          script: Buffer.from(output.scriptPubKey, 'hex'),
          value: Number(output.value),
        })),
      } as unknown as Psbt);

      const getTransactionSpendingInputSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(customNetwork as any, 'getTransactionSpendingInput')
        .mockResolvedValue(testData.firoTx);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(getTransactionSpendingInputSpy).toHaveBeenCalledExactlyOnceWith(
        0,
        testData.firoTx.inputs[0]!.txId,
      );
      expect(result).toEqual(testData.txId);
    });
  });
});
