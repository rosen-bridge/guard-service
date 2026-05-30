import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  FailedError,
  NetworkError,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { setMockResponses, resetMock } from './mocked/electrumxSocket.mock';
import FiroElectrumXNetwork, {
  addressToScripthash,
} from '../lib/firoElectrumxNetwork';
import * as testData from './testData';

describe('FiroElectrumXNetwork', () => {
  const HOST = '127.0.0.1';
  const PORT = 50001;
  const mockGetSavedTransactionById = vi.fn().mockReturnValue(undefined);

  beforeEach(() => {
    resetMock();
    mockGetSavedTransactionById.mockReset();
    mockGetSavedTransactionById.mockReturnValue(undefined);
  });

  describe('addressToScripthash', () => {
    it('should produce correct scripthash for P2PKH address', () => {
      const scripthash = addressToScripthash(testData.lockAddress);

      expect(scripthash).toBe(
        '53787b5ebd3152e257d1ed402ca773aa83fca5981ed9c3b02bf9e5299dd36960',
      );
    });

    it('should produce correct scripthash for P2SH address', () => {
      const scripthash = addressToScripthash(
        '2EdAinnuw3zCy8arpSKRwQYQK2MBC5VMXu9',
      );

      expect(scripthash).toBe(
        '7914236249d96d4931978817b2fe3c9071e8b4daf4decd3087dbba955fd7f66f',
      );
    });

    it('should throw for invalid checksum', () => {
      expect(() =>
        addressToScripthash('THzVvKwY5dAD6gM5z4Mz3jG9RbqhkS8h7W'),
      ).toThrow('checksum');
    });
  });

  describe('getHeight', () => {
    /**
     * @target `FiroElectrumXNetwork.getHeight` should return block height successfully
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.headers.subscribe response
     * - create new instance of FiroElectrumXNetwork
     * - call getHeight
     * @expected
     * - it should return mocked block height
     */
    it('should return block height successfully', async () => {
      setMockResponses([testData.blockHeightResponse]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeightResponse.height);
    });

    /**
     * @target `FiroElectrumXNetwork.getHeight` should throw NetworkError on TCP error
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock TCP connection to fail
     * @expected
     * - it should throw NetworkError
     */
    it('should throw NetworkError on TCP error', async () => {
      const { createConnection } = await import('net');
      vi.mocked(createConnection).mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      await expect(network.getHeight()).rejects.toThrow(NetworkError);
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `FiroElectrumXNetwork.getBlockTransactionIds` should return block tx ids
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.block.txids response
     * - pre-populate hash→height cache via getBlockInfo/resolveHeight
     * @expected
     * - it should return mocked tx ids
     */
    it('should return block tx ids successfully', async () => {
      setMockResponses([testData.blockTxIds]); // only blockchain.block.txids is called

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      // Pre-populate the height cache so resolveHeight returns immediately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (network as any).hashToHeight.set(testData.blockHash, 42);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (network as any).lastKnownHeight = 43;

      const result = await network.getBlockTransactionIds(testData.blockHash);
      expect(result).toEqual(testData.blockTxIds);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `FiroElectrumXNetwork.getBlockInfo` should return block info
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.block.header response
     * - pre-populate hash→height cache
     * @expected
     * - it should return correct hash, parentHash, and height
     */
    it('should return block info successfully', async () => {
      setMockResponses([
        testData.blockHeaderHex, // blockchain.block.header response
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (network as any).hashToHeight.set(testData.blockHash, testData.blockInfo.height);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (network as any).lastKnownHeight = testData.blockInfo.height;

      const result = await network.getBlockInfo(testData.blockHash);
      expect(result.hash).toBe(testData.blockInfo.hash);
      expect(result.parentHash).toBe(testData.blockInfo.parentHash);
      expect(result.height).toBe(testData.blockInfo.height);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `FiroElectrumXNetwork.getTransaction` should return transaction
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.transaction.get response
     * @expected
     * - it should return parsed FiroTx
     */
    it('should return transaction successfully', async () => {
      setMockResponses([testData.txHex]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result.id).toEqual(testData.txId);
      expect(result.inputs.length).toEqual(testData.firoTx.inputs.length);
      expect(result.outputs.length).toEqual(testData.firoTx.outputs.length);
      expect(result.outputs[0]!.value).toEqual(testData.firoTx.outputs[0]!.value);
      expect(result.outputs[0]!.scriptPubKey).toEqual(
        testData.firoTx.outputs[0]!.scriptPubKey,
      );
    });

    it('should parse a version 3 Firo transaction with packed type', async () => {
      setMockResponses([testData.txHexV3Typed]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result.id).toEqual(testData.txId);
      expect(result.inputs.length).toEqual(testData.firoTx.inputs.length);
      expect(result.outputs.length).toEqual(testData.firoTx.outputs.length);
      expect(result.outputs[0]!.value).toEqual(testData.firoTx.outputs[0]!.value);
      expect(result.outputs[1]!.scriptPubKey).toEqual(
        testData.firoTx.outputs[1]!.scriptPubKey,
      );
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `FiroElectrumXNetwork.isBoxUnspentAndValid` should return true for unspent output
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock transaction hex and listunspent containing the box
     * @expected
     * - it should return true
     */
    it('should return true for unspent output', async () => {
      setMockResponses([
        testData.txHex,
        [{ tx_hash: testData.txId, tx_pos: 0, height: 42, value: 119595114000 }],
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(true);
    });

    /**
     * @target `FiroElectrumXNetwork.isBoxUnspentAndValid` should return false for spent output
     * @dependencies
     * - net (TCP)
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

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(false);
    });

    /**
     * @target `FiroElectrumXNetwork.isBoxUnspentAndValid` should return false when tx doesn't exist
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX to return error for non-existent tx
     * @expected
     * - it should return false
     */
    it("should return false when transaction doesn't exist", async () => {
      // Simulate error by providing no response (the mock will time out)
      // Actually, the mock handles this by having sendRequest reject for missing response
      // Better approach: use a real error response from ElectrumX
      setMockResponses([
        { error: { message: 'No such transaction', code: -5 } },
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`nonexistent.0`);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `FiroElectrumXNetwork.getUtxo` should return UTXO data
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock transaction hex with the requested output
     * @expected
     * - it should return correct UTXO
     */
    it('should return UTXO data successfully', async () => {
      setMockResponses([testData.txHex]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getUtxo(`${testData.txId}.0`);

      expect(result.txId).toEqual(testData.txId);
      expect(result.index).toEqual(0);
      expect(result.value).toEqual(testData.firoUtxo.value);
    });

    /**
     * @target `FiroElectrumXNetwork.getUtxo` should throw FailedError for invalid output index
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock transaction hex, request non-existent output index
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError for invalid output index', async () => {
      setMockResponses([testData.txHex]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      await expect(network.getUtxo(`${testData.txId}.999`)).rejects.toThrow(
        FailedError,
      );
    });
  });

  describe('getFeeRatio', () => {
    /**
     * @target `FiroElectrumXNetwork.getFeeRatio` should return fee ratio
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.estimatefee response
     * @expected
     * - it should return calculated fee ratio in satoshis/byte
     */
    it('should return fee ratio successfully', async () => {
      setMockResponses([testData.estimatedFee]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
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
     * - net (TCP)
     * @scenario
     * - mock verbose get to return an existing tx without confirmations
     * @expected
     * - it should return true
     */
    it('should return true when tx is in mempool', async () => {
      setMockResponses([
        { hex: testData.txHex },
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(true);
    });

    /**
     * @target `FiroElectrumXNetwork.isTxInMempool` should return false when tx is confirmed
     * @dependencies
     * - net (TCP)
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

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });

    /**
     * @target `FiroElectrumXNetwork.isTxInMempool` should return false when tx is not found
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock verbose get to fail
     * @expected
     * - it should return false
     */
    it('should return false when tx is not found', async () => {
      setMockResponses([
        { error: { message: 'not found', code: -1 } },
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });
  });

  describe('getTransactionHex', () => {
    /**
     * @target `FiroElectrumXNetwork.getTransactionHex` should return transaction hex
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.transaction.get response
     * @expected
     * - it should return the raw hex string
     */
    it('should return transaction hex successfully', async () => {
      setMockResponses([testData.txHex]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getTransactionHex(testData.txId);

      expect(result).toEqual(testData.txHex);
    });
  });

  describe('submitTransaction', () => {
    /**
     * @target `FiroElectrumXNetwork.submitTransaction` should submit transaction
     * @dependencies
     * - net (TCP), bitcoinjs-lib Psbt
     * @scenario
     * - mock Psbt for transaction extraction
     * - mock ElectrumX broadcast response
     * @expected
     * - it should not throw error
     */
    it('should submit transaction successfully', async () => {
      setMockResponses([testData.txId]); // broadcast returns txid

      const mockPsbt = {
        finalizeAllInputs: vi.fn(),
        extractTransaction: vi.fn().mockReturnValue({
          toHex: vi.fn().mockReturnValue('01000000...'),
        }),
      };

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        network.submitTransaction(mockPsbt as any),
      ).resolves.not.toThrow();
    });
  });

  describe('getAddressBoxes', () => {
    /**
     * @target `FiroElectrumXNetwork.getAddressBoxes` should return address UTXOs with pagination
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock ElectrumX listunspent response
     * @expected
     * - it should return paginated UTXOs in correct format
     */
    it('should return address UTXOs successfully with pagination', async () => {
      setMockResponses([testData.mockAddressUtxos]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getAddressBoxes(testData.lockAddress, 0, 2);

      expect(result).toEqual(testData.expectedAddressBoxes);
    });

    /**
     * @target `FiroElectrumXNetwork.getAddressBoxes` should handle empty address
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock empty listunspent response
     * @expected
     * - it should return empty array
     */
    it('should handle empty address', async () => {
      setMockResponses([[]]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getAddressBoxes('empty-address', 0, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should return confirmation count
     * @dependencies
     * - net (TCP)
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

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.expectedTxConfirmation);
    });

    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should return -1 for unconfirmed tx
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock verbose get to return an existing tx without confirmations
     * @expected
     * - it should return -1
     */
    it('should return -1 for unconfirmed transaction', async () => {
      setMockResponses([
        { hex: testData.txHex },
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should return -1 when tx not found
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock verbose get to throw
     * @expected
     * - it should return -1
     */
    it('should return -1 when transaction is not found', async () => {
      setMockResponses([
        { error: { message: 'not found', code: -1 } },
      ]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getTxConfirmation('nonexistent-tx-id');

      expect(result).toEqual(-1);
    });

    /**
     * @target `FiroElectrumXNetwork.getTxConfirmation` should handle tx with unsigned hash
     * @dependencies
     * - net (TCP), bitcoinjs-lib Psbt
     * @scenario
     * - create custom getSavedTransactionById returning a payment tx
     * - mock direct PSBT extraction success
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

      const customNetwork = new FiroElectrumXNetwork(HOST, PORT, async (txId: string) => {
        if (txId === testData.unsignedTxId) {
          return firoPayment;
        }
        return undefined;
      });

      const getTxConfirmationSignedSpy = vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customNetwork as any,
        'getTxConfirmationSigned',
      );

      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customNetwork as any,
        'extractActualTxIdFromPsbt',
      ).mockResolvedValue(testData.txId);

      setMockResponses([
        {
          hex: testData.txHex,
          blockhash: testData.txBlockHash,
          confirmations: testData.expectedTxConfirmation,
        },
      ]);

      const result = await customNetwork.getTxConfirmation(testData.unsignedTxId);

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
     * - net (TCP)
     * @scenario
     * - mock ElectrumX blockchain.scripthash.get_balance response
     * @expected
     * - it should return native token balance
     */
    it('should return address balance successfully', async () => {
      setMockResponses([testData.balanceResponse]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result.nativeToken).toEqual(testData.expectedAddressBalance);
      expect(result.tokens).toEqual([]);
    });

    /**
     * @target `FiroElectrumXNetwork.getAddressAssets` should return 0 for empty address
     * @dependencies
     * - net (TCP)
     * @scenario
     * - mock zero balance response
     * @expected
     * - it should return 0 balance
     */
    it('should return 0 for empty address', async () => {
      setMockResponses([{ confirmed: 0, unconfirmed: 0 }]);

      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getAddressAssets('empty-address');

      expect(result.nativeToken).toEqual(0n);
      expect(result.tokens).toEqual([]);
    });
  });

  describe('getSpentTransactionByInputId', () => {
    /**
     * @target `FiroElectrumXNetwork.getSpentTransactionByInputId` should return undefined
     * @dependencies
     * - none
     * @scenario
     * - call getSpentTransactionByInputId (ElectrumX has no getspentinfo)
     * @expected
     * - it should return undefined
     */
    it('should return undefined (no getspentinfo in ElectrumX)', async () => {
      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (network as any).getSpentTransactionByInputId(
        0,
        testData.txId,
      );

      expect(result).toBeUndefined();
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
      const network = new FiroElectrumXNetwork(HOST, PORT, mockGetSavedTransactionById);
      const result = await network.getActualTxId(testData.txId);

      expect(result).toEqual(testData.txId);
    });

    /**
     * @target `FiroElectrumXNetwork.getActualTxId` should extract signed txId from PSBT (method 1)
     * @dependencies
     * - bitcoinjs-lib Psbt
     * @scenario
     * - create custom getSavedTransactionById returning payment tx
     * - mock direct PSBT extraction to succeed
     * @expected
     * - it should return signed txId
     */
    it('should extract signed txId from PSBT using direct method', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroElectrumXNetwork(HOST, PORT, async (txId: string) => {
        if (txId === testData.unsignedTxId) {
          return firoPayment;
        }
        return undefined;
      });

      const extractDirectSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(customNetwork as any, 'extractActualTxIdFromPsbt')
        .mockResolvedValue(testData.txId);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(extractDirectSpy).toHaveBeenCalled();
      expect(result).toEqual(testData.txId);
    });

    /**
     * @target `FiroElectrumXNetwork.getActualTxId` should return original hash when extraction fails
     * @dependencies
     * - bitcoinjs-lib Psbt
     * @scenario
     * - mock both extraction methods to fail
     * @expected
     * - it should return original hash
     */
    it('should return original hash when extraction fails', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroElectrumXNetwork(HOST, PORT, async (txId: string) => {
        if (txId === testData.unsignedTxId) {
          return firoPayment;
        }
        return undefined;
      });

      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customNetwork as any,
        'extractActualTxIdFromPsbt',
      ).mockResolvedValue(undefined);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(result).toEqual(testData.unsignedTxId);
    });
  });
});
