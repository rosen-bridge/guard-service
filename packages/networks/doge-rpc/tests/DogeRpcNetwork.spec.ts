import {
  FailedError,
  PaymentTransaction,
  TransactionType,
  NetworkError,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';
import DogeRpcNetwork from '../lib/DogeRpcNetwork';
import {
  mockAxiosPost,
  mockAxiosPostToThrow,
  resetAxiosMock,
  axiosInstance,
} from './mocked/axios.mock';
import * as testData from './testData';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

describe('DogeRpcNetwork', () => {
  const getSavedTransactionById = async () => undefined;
  const URL = 'doge-rpc-url';
  const TIMEOUT = 1000;

  beforeEach(() => {
    resetAxiosMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * @target Functions that are not in implements should contain 'not implemented' error logic
   * @dependencies
   * @scenario
   * - Create instance of DogeRpcNetwork
   * - Check specific functions that are not implemented
   * @expected
   * - Those functions should contain the 'not implemented' error message
   */
  it('should include "not implemented" error logic in non-implemented functions', () => {
    const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);

    const nonImplementedFunctions = [
      'getTxConfirmation',
      'getAddressAssets',
      'getAddressBoxes',
      'getSpentTransactionByInputId',
    ];

    // For each non-implemented function
    nonImplementedFunctions.forEach((funcName) => {
      // Get the function from the network instance
      const method = network[funcName as keyof typeof network];

      // The method should exist and be a function
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');

      // Convert method to string to check its implementation
      const methodStr = method.toString();

      // Should contain the "not implemented" error message
      expect(methodStr).toContain('Not implemented');
    });
  });

  describe('getHeight', () => {
    /**
     * @target `DogeRpcNetwork.getHeight` should return block height successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeightResponse.result.blocks);
    });

    /**
     * @target `DogeRpcNetwork.getHeight` should throw FailedError when API returns error
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      await expect(network.getHeight()).rejects.toThrow(FailedError);
    });

    /**
     * @target `DogeRpcNetwork.getHeight` should throw NetworkError when network error occurs
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      await expect(network.getHeight()).rejects.toThrow(NetworkError);
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `DogeRpcNetwork.getBlockTransactionIds` should return block tx ids successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockResponse.result.tx);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `DogeRpcNetwork.getBlockInfo` should return block info successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `DogeRpcNetwork.getTransaction` should return transaction successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash
      );

      expect(result).toEqual(testData.dogeTx);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `DogeRpcNetwork.isBoxUnspentAndValid` should return true for unspent output
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}_0`);

      expect(result).toEqual(true);
    });

    /**
     * @target `DogeRpcNetwork.isBoxUnspentAndValid` should return false for spent output
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}_0`);

      expect(result).toEqual(false);
    });

    /**
     * @target `DogeRpcNetwork.isBoxUnspentAndValid` should return false when transaction doesn't exist
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.isBoxUnspentAndValid(`${testData.txId}_0`);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `DogeRpcNetwork.getUtxo` should return UTXO data successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getUtxo(`${testData.txId}_0`);

      expect(result.txId).toEqual(testData.txId);
      expect(result.index).toEqual(0);
      expect(result.value).toEqual(testData.dogeUtxo.value);
    });

    /**
     * @target `DogeRpcNetwork.getUtxo` should throw error when UTXO is spent
     * @dependencies
     * @scenario
     * - mock axios for transaction data
     * - mock axios for spent UTXO (null result)
     * - run test
     * - check error is thrown
     * @expected
     * - it should throw an error
     */
    it('should throw error when UTXO is spent', async () => {
      // Track which API call we're on
      let callCount = 0;

      axiosInstance.post.mockImplementation((url, data) => {
        const { method, id } = data;
        callCount++;

        if (callCount === 1 && method === 'getrawtransaction') {
          return Promise.resolve({
            data: {
              ...testData.txResponse,
              id: id,
            },
          });
        } else if (callCount === 2 && method === 'gettxout') {
          return Promise.resolve({
            data: {
              result: null,
              error: null,
              id: id,
            },
          });
        }

        return Promise.reject(
          new Error(`Unexpected method or call count: ${method}, ${callCount}`)
        );
      });

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      await expect(network.getUtxo(`${testData.txId}_0`)).rejects.toThrow(
        'UTXO with boxId'
      );
    });
  });

  describe('getFeeRatio', () => {
    /**
     * @target `DogeRpcNetwork.getFeeRatio` should return fee ratio successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getFeeRatio();

      // Convert DOGE/kB to satoshis/byte
      const expectedFeeRate = Math.ceil(
        (testData.estimateSmartFeeResponse.result.feerate * 100000000) / 1024
      );
      expect(result).toEqual(expectedFeeRate);
    });

    /**
     * @target `DogeRpcNetwork.getFeeRatio` should return default fee when estimation fails
     * @dependencies
     * @scenario
     * - mock axios to return error for fee estimation
     * - run test
     * - check default value is returned
     * @expected
     * - it should return default fee value
     */
    it('should return default fee when estimation fails', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        return Promise.resolve({
          data: {
            result: {},
            error: 'Failed to estimate fee',
            id: data.id,
          },
        });
      });

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getFeeRatio();

      // Should use default value (1000 satoshis/byte)
      expect(result).toEqual(1000);
    });
  });

  describe('isTxInMempool', () => {
    /**
     * @target `DogeRpcNetwork.isTxInMempool` should return true when tx is in mempool
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(true);
    });

    /**
     * @target `DogeRpcNetwork.isTxInMempool` should return false when tx is not in mempool
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });
  });

  describe('getTransactionHex', () => {
    /**
     * @target `DogeRpcNetwork.getTransactionHex` should return transaction hex successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      const result = await network.getTransactionHex(testData.txId);

      expect(result).toEqual(testData.txHexResponse.result);
    });
  });

  describe('submitTransaction', () => {
    /**
     * @target `DogeRpcNetwork.submitTransaction` should submit transaction successfully
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

      const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);
      // This should not throw an error
      await expect(
        network.submitTransaction(mockPsbt as any)
      ).resolves.not.toThrow();
    });
  });
});
