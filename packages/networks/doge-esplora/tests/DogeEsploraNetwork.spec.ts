import {
  FailedError,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import DogeEsploraNetwork from '../lib/DogeEsploraNetwork';
import {
  mockAxiosGet,
  mockAxiosGetToThrow,
  resetAxiosMock,
} from './mocked/axios.mock';
import * as testData from './testData';
import { vi } from 'vitest';

describe('DogeEsploraNetwork', () => {
  let network: DogeEsploraNetwork;

  beforeEach(() => {
    resetAxiosMock();
    network = new DogeEsploraNetwork('esplora-url', async () => undefined);
  });

  describe('getHeight', () => {
    /**
     * @target `DogeEsploraNetwork.getHeight` should return block height successfully
     * @dependencies
     * @scenario
     * - mock axios to return height
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return block height successfully', async () => {
      mockAxiosGet(testData.blockHeight);

      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeight);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `DogeEsploraNetwork.getTxConfirmation` should return tx confirmation successfully
     * @dependencies
     * @scenario
     * - mock axios to return height
     * - mock axios to return tx
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked height minus mocked tx height
     */
    it('should fetch confirmation using txId successfully', async () => {
      mockAxiosGet(testData.blockHeight);
      mockAxiosGet(testData.txResponse);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.txConfirmation);
    });

    /**
     * @target `DogeEsploraNetwork.getTxConfirmation` should return -1
     * when transaction is not found
     * @dependencies
     * @scenario
     * - mock axios to return height
     * - mock axios to throw not found error
     * - run test
     * - check returned value
     * @expected
     * - it should be -1
     */
    it('should return -1 when transaction is not found', async () => {
      mockAxiosGet(testData.blockHeight);
      mockAxiosGetToThrow({
        response: {
          status: 404,
          data: 'TestResponse: Transaction not found',
        },
      });

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `DogeEsploraNetwork.getTxConfirmation` should return -1
     * when transaction is unconfirmed
     * @dependencies
     * @scenario
     * - mock axios to return height
     * - mock axios to return unconfirmed tx
     * - run test
     * - check returned value
     * @expected
     * - it should be -1
     */
    it('should return -1 when transaction is unconfirmed', async () => {
      mockAxiosGet(testData.blockHeight);
      mockAxiosGet(testData.unconfirmedTxResponse);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `DogeEsploraNetwork.getTxConfirmation` should fetch confirmation using unsigned hash successfully
     * @dependencies
     * @scenario
     * - create a new instance of DogeEsploraNetwork with a custom getSavedTransactionById
     * - run test
     * - check returned value
     * @expected
     * - it should fetch confirmation using unsigned hash successfully
     */
    it('should fetch confirmation using unsigned hash successfully', async () => {
      // Create a new instance of DogeEsploraNetwork with a custom getSavedTransactionById
      const dogePayment = new PaymentTransaction(
        'doge',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.dogePaymentBytes, 'hex'),
        TransactionType.payment
      );

      const customNetwork = new DogeEsploraNetwork(
        'esplora-url',
        async (txId) => {
          if (txId === testData.unsignedTxId) {
            return dogePayment;
          }
          return undefined;
        }
      );

      const getTxConfirmationSignedSpy = vi.spyOn(
        customNetwork as any,
        'getTxConfirmationSigned'
      );

      // Mock getSpentTransactionByInputId to return a transaction when called with the correct input
      const getSpentTransactionByInputIdSpy = vi
        .spyOn(customNetwork as any, 'getSpentTransactionByInputId')
        .mockResolvedValue(testData.dogeTx);

      mockAxiosGet(testData.blockHeight);
      mockAxiosGet(testData.txResponse);

      const result = await customNetwork.getTxConfirmation(
        testData.unsignedTxId
      );

      expect(getSpentTransactionByInputIdSpy).toHaveBeenCalledWith(
        testData.dogeTx.inputs[0].index,
        testData.dogeTx.inputs[0].txId
      );
      expect(getTxConfirmationSignedSpy).toHaveBeenCalledWith(testData.txId);
      expect(result).toEqual(testData.txConfirmation);
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target `DogeEsploraNetwork.getAddressAssets` should return address assets successfully
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info
     * - run test
     * - check returned value
     * @expected
     * - it should be expected DOGE balance with no tokens
     */
    it('should return address assets successfully', async () => {
      mockAxiosGet(testData.addressResponse);

      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result).toEqual({
        nativeToken: testData.addressBalance,
        tokens: [],
      });
    });

    /**
     * @target `DogeEsploraNetwork.getAddressAssets` should return 0 balance
     * when address has no DOGE
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info with zero balance
     * - run test
     * - check returned value
     * @expected
     * - it should be zero native tokens with no tokens
     */
    it('should return 0 balance when address has no DOGE', async () => {
      mockAxiosGet(testData.emptyAddressResponse);

      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result).toEqual({ nativeToken: 0n, tokens: [] });
    });

    /**
     * @target `DogeEsploraNetwork.getAddressAssets` should return 0 balance
     * when address has no history of transactions
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info with 0 transactions
     * - run test
     * - check returned value
     * @expected
     * - it should be zero native tokens with no tokens
     */
    it('should return 0 balance when address has no history of transactions', async () => {
      mockAxiosGet(testData.unusedAddressResponse);

      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result).toEqual({ nativeToken: 0n, tokens: [] });
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `DogeEsploraNetwork.getBlockTransactionIds` should return block tx ids successfully
     * @dependencies
     * @scenario
     * - mock axios to return tx ids
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx ids
     */
    it('should return block tx ids successfully', async () => {
      mockAxiosGet(testData.txIds);

      const result = await network.getBlockTransactionIds(testData.txId);

      expect(result).toEqual(testData.txIds);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `DogeEsploraNetwork.getBlockInfo` should return block info successfully
     * @dependencies
     * @scenario
     * - mock axios to return block info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block info
     */
    it('should return block info successfully', async () => {
      mockAxiosGet(testData.blockResponse);

      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `DogeEsploraNetwork.getTransaction` should return transaction successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx in DogeTx format
     */
    it('should return transaction successfully', async () => {
      mockAxiosGet(testData.txResponse);

      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash
      );

      expect(result).toEqual(testData.dogeTx);
    });

    /**
     * @target `DogeEsploraNetwork.getTransaction` should throw error when
     * block id is not matched with tx block
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test with wrong block hash and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when block id is not matched with tx block', async () => {
      mockAxiosGet(testData.txResponse);

      await expect(async () => {
        await network.getTransaction(testData.txId, testData.blockHash);
      }).rejects.toThrow(FailedError);
    });
  });

  describe('getAddressBoxes', () => {
    /**
     * @target `DogeEsploraNetwork.getAddressBoxes` should return address utxos successfully
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in DogeUtxo format
     */
    it('should return address utxos successfully', async () => {
      mockAxiosGet(testData.addressUtxoResponse);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        100
      );

      expect(result).toEqual(testData.addressUtxos);
    });

    /**
     * @target `DogeEsploraNetwork.getAddressBoxes` should return empty list
     * when no utxo is returned
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info with zero balance
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when no utxo is returned', async () => {
      mockAxiosGet([]);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        100
      );

      expect(result).toEqual([]);
    });

    /**
     * @target `DogeEsploraNetwork.getAddressBoxes` should return sorted address utxos
     * @dependencies
     * @scenario
     * - mock axios to return unsorted address utxo info
     * - run test
     * - check returned value is sorted by txId and index
     * @expected
     * - it should return utxos sorted first by txId and then by index
     */
    it('should return sorted address utxos', async () => {
      mockAxiosGet(testData.unsortedAddressUtxoResponse);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        100
      );

      expect(result).toEqual(testData.sortedAddressUtxos);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `DogeEsploraNetwork.isBoxUnspentAndValid` should return true when box is unspent
     * @dependencies
     * @scenario
     * - mock axios to return tx outspends
     * - run test with unspent box index
     * - check returned value
     * @expected
     * - it should be true
     */
    it('should return true when box is unspent', async () => {
      mockAxiosGet(testData.txOutspendsResponse);

      const boxId = `${testData.txId}.${1}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(true);
    });

    /**
     * @target `DogeEsploraNetwork.isBoxUnspentAndValid` should return false when
     * box is spent
     * @dependencies
     * @scenario
     * - mock axios to return tx outspends
     * - run test with spent box index
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when box is spent', async () => {
      mockAxiosGet(testData.txOutspendsResponse);

      const boxId = `${testData.txId}.${0}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });

    /**
     * @target `DogeEsploraNetwork.isBoxUnspentAndValid` should return false when
     * tx is not found
     * @dependencies
     * @scenario
     * - mock axios to throw not found error
     * - run test
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when tx is not found', async () => {
      mockAxiosGetToThrow({
        response: {
          status: 404,
          data: 'TestResponse: Transaction not found',
        },
      });

      const boxId = `${testData.txId}.${1}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });

    /**
     * @target `DogeEsploraNetwork.isBoxUnspentAndValid` should return false when
     * box index is more than number of tx outputs
     * @dependencies
     * @scenario
     * - mock axios to return tx outspends
     * - run test with invalid box index
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when box index is more than number of tx outputs', async () => {
      mockAxiosGet(testData.txOutspendsResponse);

      const boxId = `${testData.txId}.${3}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `DogeEsploraNetwork.getUtxo` should return utxo successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxo
     */
    it('should return utxo successfully', async () => {
      mockAxiosGet(testData.txResponse);

      const boxId = `${testData.txId}.${0}`;
      const result = await network.getUtxo(boxId);

      expect(result).toEqual(testData.utxo);
    });

    /**
     * @target `DogeEsploraNetwork.getUtxo` should throw error when
     * tx is not found
     * @dependencies
     * @scenario
     * - mock axios to throw not found error
     * - run test and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when tx is not found', async () => {
      mockAxiosGetToThrow({
        response: {
          status: 404,
          data: 'TestResponse: Transaction not found',
        },
      });

      const boxId = `${testData.txId}.${0}`;
      await expect(async () => {
        await network.getUtxo(boxId);
      }).rejects.toThrow(FailedError);
    });

    /**
     * @target `DogeEsploraNetwork.getUtxo` should throw error when
     * box index is more than number of tx outputs
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when box index is more than number of tx outputs', async () => {
      mockAxiosGet(testData.txResponse);

      const boxId = `${testData.txId}.${3}`;
      await expect(async () => {
        await network.getUtxo(boxId);
      }).rejects.toThrow(FailedError);
    });
  });

  describe('getFeeRatio', () => {
    /**
     * @target `DogeEsploraNetwork.getFeeRatio` should return fee ratio successfully
     * @dependencies
     * @scenario
     * - mock axios to return fee estimates
     * - run test
     * - check returned value
     * @expected
     * - it should be fee estimation for 6 confirmation
     */
    it('should return fee ratio successfully', async () => {
      mockAxiosGet(testData.feeEstimatesResponse);

      const result = await network.getFeeRatio();

      expect(result).toEqual(testData.targetFeeEstimation);
    });
  });

  describe('getMempoolTxIds', () => {
    /**
     * @target `DogeEsploraNetwork.getMempoolTxIds` should return mempool tx ids successfully
     * @dependencies
     * @scenario
     * - mock axios to return tx ids
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx ids
     */
    it('should return mempool tx ids successfully', async () => {
      mockAxiosGet(testData.txIds);

      const result = await network.getMempoolTxIds();

      expect(result).toEqual(testData.txIds);
    });
  });

  describe('getSpentTransactionByInputId', () => {
    /**
     * @target `DogeEsploraNetwork.getSpentTransactionByInputId` should return transaction
     * when box is spent
     * @dependencies
     * @scenario
     * - mock axios to return spent box info
     * - mock getTransaction to return a transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be the mocked transaction
     */
    it('should return transaction when box is spent', async () => {
      mockAxiosGet(testData.spentResult);
      const getTransactionSpy = vi
        .spyOn(network, 'getTransaction')
        .mockResolvedValue(testData.dogeTx);

      const result = await (network as any).getSpentTransactionByInputId(
        testData.spentIndex,
        testData.spentTxId
      );

      expect(result).toEqual(testData.dogeTx);
      expect(getTransactionSpy).toHaveBeenCalledWith(
        testData.spentResult.txid,
        testData.spentResult.status.block_hash
      );
    });

    /**
     * @target `DogeEsploraNetwork.getSpentTransactionByInputId` should return undefined
     * when box is unspent
     * @dependencies
     * @scenario
     * - mock axios to return unspent box info
     * - run test
     * - check returned value
     * @expected
     * - it should be undefined
     */
    it('should return undefined when box is unspent', async () => {
      mockAxiosGet(testData.unspentResult);

      const result = await (network as any).getSpentTransactionByInputId(
        testData.unspentIndex,
        testData.unspentTxId
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getTransactionHex', () => {
    /**
     * @target `DogeEsploraNetwork.getTransactionHex` should return transaction hex successfully
     * @dependencies
     * @scenario
     * - mock axios to return tx hex
     * - run test
     * - check returned value
     * @expected
     * - it should return the mocked tx hex
     */
    it('should return transaction hex successfully', async () => {
      const mockTxHex =
        '020000000134292f961bb726fad6f54d904fe9177931493e46a8b8b99de6b1e338dee29785020000006a47304402207e4cd2745243257f0749b4a41425c2075dfb199f47072bfbf7db14b02677a8ae02204682c5159737314f7c4ba0f7112876497171a7cee48dddf667dccd59cf8ae1280121022b9ed0a9139042921decc62603a4a07357b444da2e0bd6a96c27155117913037ffffffff0300000000000000006a33000000000005f5e10000000000009896802103e5bedab3f782ef17a73e9bdc41ee0e18c3ab477400f35bcf7caa54171db7ff3600ca9a3b0000000017a914d4c141068ab3a242aed5081a27ac3f10ad99ac988788a4645600000000976a914872b67c8270a9eaf5c2abf632af3dea989d2e37188ac00000000';
      mockAxiosGet(mockTxHex);

      const result = await network.getTransactionHex(testData.txId);

      expect(result).toEqual(mockTxHex);
    });

    /**
     * @target `DogeEsploraNetwork.getTransactionHex` should throw error when
     * request fails
     * @dependencies
     * @scenario
     * - mock axios to throw error
     * - run test and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when request fails', async () => {
      mockAxiosGetToThrow({
        response: {
          status: 404,
          data: 'Transaction not found',
        },
      });

      await expect(async () => {
        await network.getTransactionHex(testData.txId);
      }).rejects.toThrow(FailedError);
    });
  });
});
