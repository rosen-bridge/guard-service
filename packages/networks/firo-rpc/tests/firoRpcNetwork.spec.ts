import { vi, describe, it, expect, beforeEach } from 'vitest';

import {
  FailedError,
  NetworkError,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import FiroRpcNetwork from '../lib/firoRpcNetwork';
import { resetAxiosMock, axiosInstance } from './mocked/rateLimitedAxios.mock';
import * as testData from './testData';

describe('FiroRpcNetwork', () => {
  const URL = 'firo-rpc-url';
  const mockGetSavedTransactionById = vi.fn().mockReturnValue(undefined);

  beforeEach(() => {
    resetAxiosMock();
  });

  describe('getHeight', () => {
    /**
     * @target `FiroRpcNetwork.getHeight` should return block height successfully
     * @dependencies
     * @scenario
     * - mock axios to return blockchain info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return block height successfully', async () => {
      // Set up the mock for this specific test
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.blockHeightResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeightResponse.result.blocks);
    });

    /**
     * @target `FiroRpcNetwork.getHeight` should throw FailedError when API returns error
     * @dependencies
     * @scenario
     * - mock axios to return error response
     * - run test
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError when API returns error', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Server error',
          },
        },
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      await expect(network.getHeight()).rejects.toThrow(FailedError);
    });

    /**
     * @target `FiroRpcNetwork.getHeight` should throw NetworkError when network error occurs
     * @dependencies
     * @scenario
     * - mock axios to throw network error
     * - run test
     * @expected
     * - it should throw NetworkError
     */
    it('should throw NetworkError when network error occurs', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        request: {},
        message: 'Network error',
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      await expect(network.getHeight()).rejects.toThrow(NetworkError);
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `FiroRpcNetwork.getBlockTransactionIds` should return block tx ids successfully
     * @dependencies
     * @scenario
     * - mock axios to return block data
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx ids
     */
    it('should return block tx ids successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.blockResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockResponse.result.tx);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `FiroRpcNetwork.getBlockInfo` should return block info successfully
     * @dependencies
     * @scenario
     * - mock axios to return block data
     * - run test
     * - check returned value
     * @expected
     * - it should match mocked block info
     */
    it('should return block info successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.blockResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `FiroRpcNetwork.getTransaction` should return transaction successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction data
     * - run test
     * - check returned value
     * @expected
     * - it should match expected transaction format
     */
    it('should return transaction successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.txResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.firoTx);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `FiroRpcNetwork.isBoxUnspentAndValid` should return true for unspent output
     * @dependencies
     * @scenario
     * - mock axios to return UTXO data
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true for unspent output', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.txOutResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(true);
    });

    /**
     * @target `FiroRpcNetwork.isBoxUnspentAndValid` should return false for spent output
     * @dependencies
     * @scenario
     * - mock axios to return null for spent output
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false for spent output', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        return Promise.resolve({
          data: {
            result: null,
            error: null,
            id: data.id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(false);
    });

    /**
     * @target `FiroRpcNetwork.isBoxUnspentAndValid` should return false when transaction doesn't exist
     * @dependencies
     * @scenario
     * - mock axios to throw error with code -5 (no such transaction)
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it("should return false when transaction doesn't exist", async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: -5,
              message: 'No such transaction',
            },
          },
        },
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}.0`);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `FiroRpcNetwork.getUtxo` should return UTXO data successfully
     * @dependencies
     * @scenario
     * - mock axios for transaction and UTXO check
     * - run test
     * - check returned value
     * @expected
     * - it should match expected UTXO format
     */
    it('should return UTXO data successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { method, id } = data;

        if (method === 'getrawtransaction') {
          return Promise.resolve({
            data: {
              ...testData.txResponse,
              id: id,
            },
          });
        } else if (method === 'gettxout') {
          return Promise.resolve({
            data: {
              ...testData.txOutResponse,
              id: id,
            },
          });
        }

        return Promise.reject(new Error(`Unexpected method: ${method}`));
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getUtxo(`${testData.txId}.0`);

      expect(result.txId).toEqual(testData.txId);
      expect(result.index).toEqual(0);
      expect(result.value).toEqual(testData.firoUtxo.value);
    });
  });

  describe('getFeeRatio', () => {
    /**
     * @target `FiroRpcNetwork.getFeeRatio` should return fee ratio successfully
     * @dependencies
     * @scenario
     * - mock axios to return fee estimation
     * - run test
     * - check returned value
     * @expected
     * - it should return calculated fee ratio (satoshis/byte)
     */
    it('should return fee ratio successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.estimateSmartFeeResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getFeeRatio();

      // Convert FIRO/kB to satoshis/byte
      const expectedFeeRate = Math.ceil(
        (testData.estimateSmartFeeResponse.result.feerate * 100000000) / 1024,
      );
      expect(result).toEqual(expectedFeeRate);
    });
  });

  describe('isTxInMempool', () => {
    /**
     * @target `FiroRpcNetwork.isTxInMempool` should return true when tx is in mempool
     * @dependencies
     * @scenario
     * - mock axios to return success for mempool query
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when tx is in mempool', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: { fees: 0.1 },
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(true);
    });

    /**
     * @target `FiroRpcNetwork.isTxInMempool` should return false when tx is not in mempool
     * @dependencies
     * @scenario
     * - mock axios to return error for tx not in mempool
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when tx is not in mempool', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            ...testData.txNotInMempoolResponse,
          },
        },
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });
  });

  describe('getTransactionHex', () => {
    /**
     * @target `FiroRpcNetwork.getTransactionHex` should return transaction hex successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction hex
     * - run test
     * - check returned value
     * @expected
     * - it should match expected transaction hex
     */
    it('should return transaction hex successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.txHexResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getTransactionHex(testData.txId);

      expect(result).toEqual(testData.txHexResponse.result);
    });
  });

  describe('submitTransaction', () => {
    /**
     * @target `FiroRpcNetwork.submitTransaction` should submit transaction successfully
     * @dependencies
     * @scenario
     * - mock Psbt for transaction extraction
     * - mock axios response for submission
     * - run test
     * @expected
     * - it should not throw error
     */
    it('should submit transaction successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: testData.txId,
            error: null,
            id: id,
          },
        });
      });

      // Create a mock PSBT
      const mockPsbt = {
        finalizeAllInputs: vi.fn(),
        extractTransaction: vi.fn().mockReturnValue({
          toHex: vi.fn().mockReturnValue('01000000...'),
        }),
      };

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      // This should not throw an error
      await expect(
        network.submitTransaction(mockPsbt as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      ).resolves.not.toThrow();
    });
  });

  describe('getAddressBoxes', () => {
    /**
     * @target `FiroRpcNetwork.getAddressBoxes` should return address UTXOs successfully with pagination
     * @dependencies
     * @scenario
     * - mock axios to return listunspent data
     * - run test with pagination parameters
     * - check returned value
     * @expected
     * - it should return paginated UTXOs in correct format
     */
    it('should return address UTXOs successfully with pagination', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: testData.mockAddressUtxos,
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      // Get first 2 UTXOs (offset 0, limit 2)
      const result = await network.getAddressBoxes(testData.lockAddress, 0, 2);

      expect(result).toEqual(testData.expectedAddressBoxes);
    });

    /**
     * @target `FiroRpcNetwork.getAddressBoxes` should handle empty address
     * @dependencies
     * @scenario
     * - mock axios to return empty UTXO list
     * - run test
     * - check returned value
     * @expected
     * - it should return empty array
     */
    it('should handle empty address', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: [],
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getAddressBoxes('empty-address', 0, 10);

      expect(result).toEqual([]);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `FiroRpcNetwork.getTxConfirmation` should return confirmation count successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction with confirmations
     * - run test
     * - check returned value
     * @expected
     * - it should return correct number of confirmations
     */
    it('should return confirmation count successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.txResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.expectedTxConfirmation);
    });

    /**
     * @target `FiroRpcNetwork.getTxConfirmation` should return -1 for unconfirmed tx
     * @dependencies
     * @scenario
     * - mock axios to return transaction without confirmations field
     * - run test
     * - check returned value
     * @expected
     * - it should return -1
     */
    it('should return -1 for unconfirmed transaction', async () => {
      const unconfirmedTxResponse = {
        result: {
          ...testData.txResponse.result,
          confirmations: undefined,
        },
        error: null,
        id: 'tx_request',
      };

      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...unconfirmedTxResponse,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `FiroRpcNetwork.getTxConfirmation` should return -1 when transaction is not found
     * @dependencies
     * @scenario
     * - mock axios to return error code -5 for non-existent tx
     * - run test
     * - check returned value
     * @expected
     * - it should return -1
     */
    it('should return -1 when transaction is not found', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            result: null,
            error: {
              code: -5,
              message: 'No such transaction',
            },
          },
        },
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getTxConfirmation('nonexistent-tx-id');

      expect(result).toEqual(-1);
    });

    /**
     * @target `FiroRpcNetwork.getTxConfirmation` should fetch confirmation using unsigned hash successfully
     * @dependencies
     * @scenario
     * - create a custom getSavedTransactionById that returns a payment transaction
     * - mock extraction methods to resolve the unsigned hash to a signed hash
     * - mock axios to return transaction with confirmations
     * - run test
     * - check returned value
     * @expected
     * - it should resolve the unsigned hash and return the correct confirmation count
     */
    it('should fetch confirmation using unsigned hash successfully', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroRpcNetwork(
        URL,
        async (txId: string) => {
          if (txId === testData.unsignedTxId) {
            return firoPayment;
          }
          return undefined;
        },
      );

      const getTxConfirmationSignedSpy = vi.spyOn(
        customNetwork as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        'getTxConfirmationSigned',
      );

      // Mock direct extraction to fail, RPC lookup to succeed
      vi.spyOn(
        customNetwork as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        'extractActualTxIdFromPsbt',
      ).mockResolvedValue(undefined);
      vi.spyOn(
        customNetwork as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        'extractActualTxIdWithRpcLookup',
      ).mockResolvedValue(testData.firoTx.id);

      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            ...testData.txResponse,
            id: id,
          },
        });
      });

      const result = await customNetwork.getTxConfirmation(
        testData.unsignedTxId,
      );

      expect(getTxConfirmationSignedSpy).toHaveBeenCalledExactlyOnceWith(
        testData.firoTx.id,
      );
      expect(result).toEqual(testData.expectedTxConfirmation);
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target `FiroRpcNetwork.getAddressAssets` should return address balance successfully
     * @dependencies
     * @scenario
     * - mock axios to return listunspent with multiple UTXOs
     * - run test
     * - check returned value
     * @expected
     * - it should return sum of all UTXOs as native token balance
     */
    it('should return address balance successfully', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: testData.mockAddressUtxos,
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result.nativeToken).toEqual(testData.expectedAddressBalance);
      expect(result.tokens).toEqual([]); // Firo doesn't support tokens
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          method: 'listunspent',
          params: [1, 9999999, [testData.lockAddress]],
        }),
      );
    });

    /**
     * @target `FiroRpcNetwork.getAddressAssets` should return 0 for empty address
     * @dependencies
     * @scenario
     * - mock axios to return empty UTXO list
     * - run test
     * - check returned value
     * @expected
     * - it should return 0 native token balance
     */
    it('should return 0 for empty address', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: [],
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await network.getAddressAssets('empty-address');

      expect(result.nativeToken).toEqual(0n);
      expect(result.tokens).toEqual([]);
    });
  });

  describe('getSpentTransactionByInputId', () => {
    /**
     * @target `FiroRpcNetwork.getSpentTransactionByInputId` should return the spent info for a spent utxo
     * @dependencies
     * @scenario
     * - mock axios to return getspentinfo and getrawtransaction data
     * - run test
     * - check returned value
     * @expected
     * - it should return the spending transaction
     */
    it('should return the spent info for a spent utxo', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { method, id } = data;

        if (method === 'getspentinfo') {
          return Promise.resolve({
            data: {
              ...testData.spentInfoResponse,
              id: id,
            },
          });
        } else if (method === 'getrawtransaction') {
          return Promise.resolve({
            data: {
              ...testData.txResponse,
              id: id,
            },
          });
        }

        return Promise.reject(new Error(`Unexpected method: ${method}`));
      });

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await (
        network as any // eslint-disable-line @typescript-eslint/no-explicit-any
      ).getSpentTransactionByInputId(0, testData.txId);

      expect(result).toEqual(testData.firoTx);
    });

    /**
     * @target `FiroRpcNetwork.getSpentTransactionByInputId` should return undefined for an unspent utxo
     * @dependencies
     * @scenario
     * - mock axios to return error for getspentinfo
     * - run test
     * - check returned value
     * @expected
     * - it should return undefined
     */
    it('should return undefined for an unspent utxo', async () => {
      axiosInstance.post.mockRejectedValueOnce(testData.unspentInfoError);

      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const result = await (
        network as any // eslint-disable-line @typescript-eslint/no-explicit-any
      ).getSpentTransactionByInputId(0, testData.txId);

      expect(result).toBeUndefined();
    });
  });

  describe('getActualTxId', () => {
    /**
     * @target `FiroRpcNetwork.getActualTxId` should return the same hash when no saved transaction exists
     * @dependencies
     * @scenario
     * - call getActualTxId with a transaction hash
     * - check returned value
     * @expected
     * - it should return the same hash when transaction is not in database
     */
    it('should return the same hash when no saved transaction exists', async () => {
      const network = new FiroRpcNetwork(URL, mockGetSavedTransactionById);
      const hash = testData.txId;
      const result = await network.getActualTxId(hash);

      expect(result).toEqual(hash);
    });

    /**
     * @target `FiroRpcNetwork.getActualTxId` should extract signed txId from PSBT (method 1)
     * @dependencies
     * @scenario
     * - create a custom getSavedTransactionById that returns a payment transaction
     * - mock the direct PSBT extraction to succeed
     * - call getActualTxId with the unsigned hash
     * @expected
     * - it should use the direct extraction method and return signed ID
     */
    it('should extract signed txId from PSBT using direct method', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroRpcNetwork(URL, async (txId: string) => {
        if (txId === testData.unsignedTxId) {
          return firoPayment;
        }
        return undefined;
      });

      // Mock the direct extraction method to succeed
      const extractDirectSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(customNetwork as any, 'extractActualTxIdFromPsbt')
        .mockResolvedValue(testData.txId);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(extractDirectSpy).toHaveBeenCalled();
      expect(result).toEqual(testData.txId);
    });

    /**
     * @target `FiroRpcNetwork.getActualTxId` should fallback to RPC lookup when direct extraction fails
     * @dependencies
     * @scenario
     * - create a custom getSavedTransactionById that returns a payment transaction
     * - mock direct extraction to fail
     * - mock RPC lookup to succeed
     * @expected
     * - it should fallback to RPC lookup method and return signed ID
     */
    it('should fallback to RPC lookup when direct extraction fails', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroRpcNetwork(URL, async (txId: string) => {
        if (txId === testData.unsignedTxId) {
          return firoPayment;
        }
        return undefined;
      });

      // Mock direct extraction to fail
      const extractDirectSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(customNetwork as any, 'extractActualTxIdFromPsbt')
        .mockResolvedValue(undefined);

      // Mock RPC lookup to succeed
      const extractRpcSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(customNetwork as any, 'extractActualTxIdWithRpcLookup')
        .mockResolvedValue(testData.txId);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(extractDirectSpy).toHaveBeenCalled();
      expect(extractRpcSpy).toHaveBeenCalled();
      expect(result).toEqual(testData.txId);
    });

    /**
     * @target `FiroRpcNetwork.getActualTxId` should return original hash when both methods fail
     * @dependencies
     * @scenario
     * - create a custom getSavedTransactionById that returns a payment transaction
     * - mock both extraction methods to fail
     * @expected
     * - it should return the original hash as fallback
     */
    it('should return original hash when both extraction methods fail', async () => {
      const firoPayment = new PaymentTransaction(
        'firo',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.firoPaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new FiroRpcNetwork(URL, async (txId: string) => {
        if (txId === testData.unsignedTxId) {
          return firoPayment;
        }
        return undefined;
      });

      // Mock both methods to fail
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customNetwork as any,
        'extractActualTxIdFromPsbt',
      ).mockResolvedValue(undefined);
      vi.spyOn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customNetwork as any,
        'extractActualTxIdWithRpcLookup',
      ).mockResolvedValue(undefined);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      expect(result).toEqual(testData.unsignedTxId);
    });
  });
});
