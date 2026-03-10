import { vi, describe, it, expect, beforeEach } from 'vitest';

import { FailedError, NetworkError } from '@rosen-chains/abstract-chain';

import FiroRpcNetwork from '../lib/firoRpcNetwork';
import { resetAxiosMock, axiosInstance } from './mocked/rateLimitedAxios.mock';
import * as testData from './testData';

describe('FiroRpcNetwork', () => {
  const URL = 'firo-rpc-url';

  beforeEach(() => {
    resetAxiosMock();
  });

  /**
   * @target `FiroRpcNetwork` should be instantiable
   * @dependencies
   * @scenario
   * - Create instance of FiroRpcNetwork
   * @expected
   * - Instance should be created successfully
   */
  it('should create an instance of FiroRpcNetwork', () => {
    const network = new FiroRpcNetwork(URL);
    expect(network).toBeDefined();
    expect(network).toBeInstanceOf(FiroRpcNetwork);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
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

      const network = new FiroRpcNetwork(URL);
      // This should not throw an error
      await expect(
        network.submitTransaction(mockPsbt as any), // eslint-disable-line @typescript-eslint/no-explicit-any
      ).resolves.not.toThrow();
    });
  });

  describe('getAddressBoxes', () => {
    /**
     * @target `FiroRpcNetwork.getAddressBoxes` should return address UTXOs successfully
     * @dependencies
     * @scenario
     * - mock axios to return listunspent data
     * - run test with pagination parameters
     * - check returned value
     * @expected
     * - it should return paginated UTXOs in correct format
     */
    it('should return address UTXOs successfully with pagination', async () => {
      const mockUtxos = [
        {
          txid: testData.txId,
          vout: 0,
          address: testData.lockAddress,
          scriptPubKey: testData.lockAddressPublicKey,
          amount: 10.5,
          confirmations: 10,
        },
        {
          txid: '2nd-tx-id',
          vout: 1,
          address: testData.lockAddress,
          scriptPubKey: testData.lockAddressPublicKey,
          amount: 5.25,
          confirmations: 5,
        },
        {
          txid: '3rd-tx-id',
          vout: 0,
          address: testData.lockAddress,
          scriptPubKey: testData.lockAddressPublicKey,
          amount: 2.0,
          confirmations: 3,
        },
      ];

      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: mockUtxos,
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL);
      // Get first 2 UTXOs (offset 0, limit 2)
      const result = await network.getAddressBoxes(testData.lockAddress, 0, 2);

      expect(result).toHaveLength(2);
      expect(result[0].txId).toEqual(testData.txId);
      expect(result[0].index).toEqual(0);
      expect(result[0].value).toEqual(1050000000n); // 10.5 FIRO in satoshis
      expect(result[1].txId).toEqual('2nd-tx-id');
      expect(result[1].index).toEqual(1);
      expect(result[1].value).toEqual(525000000n); // 5.25 FIRO in satoshis
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

      const network = new FiroRpcNetwork(URL);
      const result = await network.getAddressBoxes('empty-address', 0, 10);

      expect(result).toEqual([]);
    });

    /**
     * @target `FiroRpcNetwork.getAddressBoxes` should throw FailedError on API error
     * @dependencies
     * @scenario
     * - mock axios to return error
     * - run test
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError on API error', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: -5,
              message: 'Invalid address',
            },
          },
        },
      });

      const network = new FiroRpcNetwork(URL);
      await expect(
        network.getAddressBoxes('invalid-address', 0, 10),
      ).rejects.toThrow(FailedError);
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

      const network = new FiroRpcNetwork(URL);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.txResponse.result.confirmations);
    });

    /**
     * @target `FiroRpcNetwork.getTxConfirmation` should return 0 for unconfirmed tx
     * @dependencies
     * @scenario
     * - mock axios to return transaction without confirmations field
     * - run test
     * - check returned value
     * @expected
     * - it should return 0
     */
    it('should return 0 for unconfirmed transaction', async () => {
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

      const network = new FiroRpcNetwork(URL);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(0);
    });

    /**
     * @target `FiroRpcNetwork.getTxConfirmation` should throw FailedError when tx not found
     * @dependencies
     * @scenario
     * - mock axios to return error for non-existent tx
     * - run test
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError when transaction not found', async () => {
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

      const network = new FiroRpcNetwork(URL);
      await expect(network.getTxConfirmation('invalid-tx-id')).rejects.toThrow(
        FailedError,
      );
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
      const mockUtxos = [{ amount: 10.5 }, { amount: 5.25 }, { amount: 2.0 }];

      axiosInstance.post.mockImplementation((url, data) => {
        const { id } = data;
        return Promise.resolve({
          data: {
            result: mockUtxos,
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL);
      const result = await network.getAddressAssets(testData.lockAddress);

      // Total: 17.75 FIRO = 1775000000 satoshis
      expect(result.nativeToken).toEqual(1775000000n);
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

      const network = new FiroRpcNetwork(URL);
      const result = await network.getAddressAssets('empty-address');

      expect(result.nativeToken).toEqual(0n);
      expect(result.tokens).toEqual([]);
    });

    /**
     * @target `FiroRpcNetwork.getAddressAssets` should include mempool transactions (minconf=0)
     * @dependencies
     * @scenario
     * - verify that the RPC call uses minconf=0 to include unconfirmed txs
     * - mock axios and check call parameters
     * - run test
     * @expected
     * - it should call listunspent with minconf=0
     */
    it('should include mempool transactions', async () => {
      axiosInstance.post.mockImplementation((url, data) => {
        const { method, params, id } = data;

        // Verify the call is made with minconf=0
        if (method === 'listunspent') {
          expect(params[0]).toEqual(0); // minconf should be 0
        }

        return Promise.resolve({
          data: {
            result: [{ amount: 1.0 }],
            error: null,
            id: id,
          },
        });
      });

      const network = new FiroRpcNetwork(URL);
      await network.getAddressAssets(testData.lockAddress);

      expect(axiosInstance.post).toHaveBeenCalled();
    });

    /**
     * @target `FiroRpcNetwork.getAddressAssets` should throw FailedError on API error
     * @dependencies
     * @scenario
     * - mock axios to return error
     * - run test
     * @expected
     * - it should throw FailedError
     */
    it('should throw FailedError on API error', async () => {
      axiosInstance.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: -5,
              message: 'Invalid address',
            },
          },
        },
      });

      const network = new FiroRpcNetwork(URL);
      await expect(network.getAddressAssets('invalid-address')).rejects.toThrow(
        FailedError,
      );
    });
  });

  describe('getActualTxId', () => {
    /**
     * @target `FiroRpcNetwork.getActualTxId` should return the same hash
     * @dependencies
     * @scenario
     * - call getActualTxId with a transaction hash
     * - check returned value
     * @expected
     * - it should return the same hash (identity function for Bitcoin-like chains)
     */
    it('should return the same hash (identity function)', async () => {
      const network = new FiroRpcNetwork(URL);
      const hash = testData.txId;
      const result = await network.getActualTxId(hash);

      expect(result).toEqual(hash);
    });

    /**
     * @target `FiroRpcNetwork.getActualTxId` should work with any hash string
     * @dependencies
     * @scenario
     * - call getActualTxId with various hash formats
     * - check returned values
     * @expected
     * - it should always return the input unchanged
     */
    it('should work with any hash string', async () => {
      const network = new FiroRpcNetwork(URL);
      const testHashes = [
        'abc123',
        '0000000000000000000000000000000000000000000000000000000000000000',
        testData.blockHash,
      ];

      for (const hash of testHashes) {
        const result = await network.getActualTxId(hash);
        expect(result).toEqual(hash);
      }
    });
  });
});
