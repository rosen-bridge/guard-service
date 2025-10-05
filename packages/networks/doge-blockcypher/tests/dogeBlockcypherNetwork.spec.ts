import {
  FailedError,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import DogeBlockcypherNetwork from '../lib/dogeBlockcypherNetwork';
import {
  mockAxiosGet,
  mockAxiosGetToThrow,
  resetAxiosMock,
  axiosInstance,
} from './mocked/axios.mock';
import * as testData from './testData';
import { vi } from 'vitest';
import axios from 'axios';

describe('DogeBlockcypherNetwork', () => {
  let network: DogeBlockcypherNetwork;

  beforeEach(() => {
    resetAxiosMock();
    network = new DogeBlockcypherNetwork(
      'blockcypher-url',
      async () => undefined,
    );
  });

  /**
   * @target `DogeBlockcypherNetwork` should not contain "not implemented" error logic in implemented functions
   * @dependencies
   * @scenario
   * - Create instance of DogeBlockCypherNetwork
   * - Check each function in the implements array
   * @expected
   * - None of the functions should contain the 'not implemented' error message
   */
  it('should not contain "not implemented" error logic in implemented functions', () => {
    // For each function in the implements array
    network.implements.forEach((funcName) => {
      // Get the function from the network instance
      const method = network[funcName as keyof typeof network];

      // The method should exist and be a function
      expect(method, `Method ${funcName} should be defined`).toBeDefined();
      expect(typeof method, `Method ${funcName} should be a function`).toBe(
        'function',
      );

      // Convert method to string to check its implementation
      const methodStr = method.toString();

      // Should not contain the "not implemented" error message
      expect(methodStr).not.toContain('not implemented');
      expect(methodStr).not.toContain('notImplemented');
    });
  });

  describe('getHeight', () => {
    /**
     * @target `DogeBlockcypherNetwork.getHeight` should return block height successfully
     * @dependencies
     * @scenario
     * - mock axios to return height
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return block height successfully', async () => {
      mockAxiosGet(testData.blockHeightResponse);

      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeightResponse.height);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `DogeBlockcypherNetwork.getTxConfirmation` should return tx confirmation successfully
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
      mockAxiosGet(testData.txResponse);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.txConfirmation);
    });

    /**
     * @target `DogeBlockcypherNetwork.getTxConfirmation` should return -1
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
     * @target `DogeBlockcypherNetwork.getTxConfirmation` should return -1
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
      mockAxiosGet(testData.unconfirmedTxResponse);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `DogeBlockcypherNetwork.getTxConfirmation` should fetch confirmation using signed hash successfully without querying spent box when PSBT is finalized
     * @dependencies
     * @scenario
     * - create a new instance of DogeBlockcypherNetwork with a custom getSavedTransactionById
     * - run test
     * - check returned value
     * @expected
     * - it should fetch confirmation using unsigned hash successfully
     */
    it('should fetch confirmation using unsigned hash successfully without querying spent box when PSBT is finalized', async () => {
      // Create a new instance of DogeBlockcypherNetwork with a custom getSavedTransactionById
      const dogePayment = new PaymentTransaction(
        'doge',
        testData.signedTxId,
        'eventId',
        Buffer.from(testData.dogePaymentBytesSigned, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new DogeBlockcypherNetwork(
        'blockcypher-url',
        async (txId: string) => {
          if (txId === testData.signedTxId) {
            return dogePayment;
          }
          return undefined;
        },
      );

      const getTxConfirmationSignedSpy = vi.spyOn(
        customNetwork as any,
        'getTxConfirmationSigned',
      );

      mockAxiosGet(testData.txResponse);

      const result = await customNetwork.getTxConfirmation(testData.signedTxId);

      const getSpentTransactionByInputIdSpy = vi.spyOn(
        customNetwork as any,
        'getSpentTransactionByInputId',
      );

      expect(getSpentTransactionByInputIdSpy).toHaveBeenCalledTimes(0);
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getTxConfirmationSignedSpy).toHaveBeenCalledWith(
        testData.signedTxId,
      );
      expect(result).toEqual(testData.txConfirmation);
    });

    /**
     * @target `DogeBlockcypherNetwork.getTxConfirmation` should fetch confirmation using unsigned hash successfully
     * @dependencies
     * @scenario
     * - create a new instance of DogeBlockcypherNetwork with a custom getSavedTransactionById
     * - run test
     * - check returned value
     * @expected
     * - it should fetch confirmation using unsigned hash successfully
     */
    it('should fetch confirmation using unsigned hash successfully', async () => {
      // Create a new instance of DogeBlockcypherNetwork with a custom getSavedTransactionById
      const dogePayment = new PaymentTransaction(
        'doge',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.dogePaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new DogeBlockcypherNetwork(
        'blockcypher-url',
        async (txId: string) => {
          if (txId === testData.unsignedTxId) {
            return dogePayment;
          }
          return undefined;
        },
      );

      const getTxConfirmationSignedSpy = vi.spyOn(
        customNetwork as any,
        'getTxConfirmationSigned',
      );

      // Mock getSpentTransactionByInputId to return a transaction when called with the correct input
      const getSpentTransactionByInputIdSpy = vi
        .spyOn(customNetwork as any, 'getSpentTransactionByInputId')
        .mockResolvedValue(testData.dogeTx);

      mockAxiosGet(testData.txResponse);

      const result = await customNetwork.getTxConfirmation(
        testData.unsignedTxId,
      );

      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getSpentTransactionByInputIdSpy).toHaveBeenCalledWith(
        testData.dogeTx.inputs[0].index,
        testData.dogeTx.inputs[0].txId,
      );
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getTxConfirmationSignedSpy).toHaveBeenCalledWith(testData.txId);
      expect(result).toEqual(testData.txConfirmation);
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target `DogeBlockcypherNetwork.getAddressAssets` should return address assets successfully
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
     * @target `DogeBlockcypherNetwork.getAddressAssets` should return 0 balance
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
     * @target `DogeBlockcypherNetwork.getAddressAssets` should return 0 balance
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
     * @target `DogeBlockcypherNetwork.getBlockTransactionIds` should return block tx ids successfully
     * @dependencies
     * @scenario
     * - mock axios to return tx ids
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx ids
     */
    it('should return block tx ids successfully', async () => {
      mockAxiosGet(testData.blockResponse);

      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockResponse.txids);
    });

    /**
     * @target `DogeBlockcypherNetwork.getBlockTransactionIds` should handle pagination for blocks with more than 500 transactions
     * @dependencies
     * @scenario
     * - mock axios to return first batch of tx ids (500 transactions)
     * - mock axios to return second batch of tx ids (300 transactions)
     * - run test
     * - check returned value
     * @expected
     * - it should be all mocked tx ids combined
     */
    it('should handle pagination for blocks with more than 500 transactions', async () => {
      // Mock the first batch (500 transactions)
      mockAxiosGet(testData.largeBlockFirstBatch);

      // Mock the second batch (300 transactions)
      mockAxiosGet(testData.largeBlockSecondBatch);

      const result = await network.getBlockTransactionIds(
        testData.largeBlockHash,
      );

      // Expected result should be all transaction IDs combined
      const expectedTxIds = [
        ...testData.largeBlockFirstBatch.txids,
        ...testData.largeBlockSecondBatch.txids,
      ];

      expect(result).toEqual(expectedTxIds);
      expect(result.length).toBe(800); // 500 + 300
    });

    /**
     * @target `DogeBlockcypherNetwork.getBlockTransactionIds` should handle errors during pagination
     * @dependencies
     * @scenario
     * - mock axios to return first batch of tx ids (500 transactions)
     * - mock axios to throw an error for the second batch
     * - run test and expect it to throw
     * @expected
     * - it should throw a FailedError
     */
    it('should handle errors during pagination', async () => {
      // Mock the first batch (500 transactions)
      mockAxiosGet(testData.largeBlockFirstBatch);

      // Mock an error for the second batch
      mockAxiosGetToThrow({
        response: {
          status: 500,
          data: 'Internal Server Error',
        },
      });

      await expect(async () => {
        await network.getBlockTransactionIds(testData.largeBlockHash);
      }).rejects.toThrow(FailedError);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `DogeBlockcypherNetwork.getBlockInfo` should return block info successfully
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
     * @target `DogeBlockcypherNetwork.getTransaction` should return transaction successfully
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
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.dogeTx);
    });

    /**
     * @target `DogeBlockcypherNetwork.getTransaction` should throw error when
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
     * @target `DogeBlockcypherNetwork.getAddressBoxes` should return address utxos successfully
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in DogeUtxo format
     */
    it('should return address utxos successfully', async () => {
      mockAxiosGet(testData.blockHeightResponse);
      mockAxiosGet(testData.addressUtxoResponse);
      const emptyAddressUtxoResponse = JSON.parse(
        JSON.stringify(testData.addressUtxoResponse),
      );
      emptyAddressUtxoResponse.txrefs = [];
      mockAxiosGet(emptyAddressUtxoResponse);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        100,
      );

      expect(result).toEqual(testData.addressUtxos);
    });

    /**
     * @target `DogeBlockcypherNetwork.getAddressBoxes` should return address utxos successfully with correct pagination
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info with correct pagination
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in DogeUtxo format
     */
    it('should return address utxos successfully with correct pagination', async () => {
      const limit = 1;
      const addressUtxoResponse = JSON.parse(
        JSON.stringify(testData.addressUtxoResponse),
      );
      addressUtxoResponse.txrefs = addressUtxoResponse.txrefs.slice(0, limit);
      mockAxiosGet(testData.blockHeightResponse);
      mockAxiosGet(addressUtxoResponse);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        limit,
      );

      expect(result).toEqual(testData.addressUtxos.slice(0, limit));
    });

    it('should return address utxos successfully with offset', async () => {
      const offset = 1;
      const limit = 1;
      const addressUtxoResponseFirst = JSON.parse(
        JSON.stringify(testData.addressUtxoResponse),
      );
      addressUtxoResponseFirst.txrefs = addressUtxoResponseFirst.txrefs.slice(
        0,
        offset,
      );
      const addressUtxoResponseSecond = JSON.parse(
        JSON.stringify(testData.addressUtxoResponse),
      );
      addressUtxoResponseSecond.txrefs = addressUtxoResponseSecond.txrefs.slice(
        offset,
        offset + limit,
      );
      mockAxiosGet(testData.blockHeightResponse);
      mockAxiosGet(addressUtxoResponseFirst);
      mockAxiosGet(addressUtxoResponseSecond);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        offset,
        limit,
      );

      expect(result).toEqual(
        testData.addressUtxos.slice(offset, offset + limit),
      );
    });

    /**
     * @target `DogeBlockcypherNetwork.getAddressBoxes` should return empty list
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
      const addrUtxoResponse = testData.addressUtxoResponse;
      addrUtxoResponse.txrefs = [];
      mockAxiosGet(testData.blockHeightResponse);
      mockAxiosGet(addrUtxoResponse);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        100,
      );

      expect(result).toEqual([]);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `DogeBlockcypherNetwork.isBoxUnspentAndValid` should return true when box is unspent
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
     * @target `DogeBlockcypherNetwork.isBoxUnspentAndValid` should return false when
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

      const boxId = `${testData.txId}.${2}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });

    /**
     * @target `DogeBlockcypherNetwork.isBoxUnspentAndValid` should return false when
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
     * @target `DogeBlockcypherNetwork.isBoxUnspentAndValid` should return false when
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
     * @target `DogeBlockcypherNetwork.getUtxo` should return utxo successfully
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
     * @target `DogeBlockcypherNetwork.getUtxo` should throw error when
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
     * @target `DogeBlockcypherNetwork.getUtxo` should throw error when
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
     * @target `DogeBlockcypherNetwork.getFeeRatio` should return fee ratio successfully
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

  describe('getSpentTransactionByInputId', () => {
    /**
     * @target `DogeBlockcypherNetwork.getSpentTransactionByInputId` should return transaction
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
      mockAxiosGet(testData.spentTx);
      const getTransactionSpy = vi
        .spyOn(network, 'getTransaction')
        .mockResolvedValue(testData.dogeTx);

      const result = await (network as any).getSpentTransactionByInputId(
        testData.spentIndex,
        testData.spentTxId,
      );

      expect(result).toEqual(testData.dogeTx);
      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getTransactionSpy).toHaveBeenCalledWith(testData.txId, '');
    });

    /**
     * @target `DogeBlockcypherNetwork.getSpentTransactionByInputId` should return undefined
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
      const unspentTx = testData.spentTx;
      unspentTx.outputs[testData.unspentIndex].spent_by = '';
      mockAxiosGet(unspentTx);

      const result = await (network as any).getSpentTransactionByInputId(
        testData.unspentIndex,
        testData.unspentTxId,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getTransactionHex', () => {
    /**
     * @target `DogeBlockcypherNetwork.getTransactionHex` should return transaction hex successfully
     * @dependencies
     * @scenario
     * - mock axios to return tx hex
     * - run test
     * - check returned value
     * @expected
     * - it should return the mocked tx hex
     */
    it('should return transaction hex successfully', async () => {
      mockAxiosGet(testData.txResponse);

      const result = await network.getTransactionHex(testData.txId);

      expect(result).toEqual(testData.txResponse.hex);
    });

    /**
     * @target `DogeBlockcypherNetwork.getTransactionHex` should throw error when
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

  describe('isTxInMempool', () => {
    /**
     * @target `DogeBlockcypherNetwork.isTxInMempool` should return true when transaction is in mempool
     * @dependencies
     * @scenario
     * - mock axios to return transaction with 0 confirmations
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when transaction is in mempool', async () => {
      const mempoolTx = { ...testData.txResponse, confirmations: 0 };
      mockAxiosGet(mempoolTx);

      const result = await network.isTxInMempool(testData.txId);

      expect(result).toBe(true);
    });

    /**
     * @target `DogeBlockcypherNetwork.isTxInMempool` should return false when transaction is confirmed
     * @dependencies
     * @scenario
     * - mock axios to return transaction with confirmations > 0
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction is confirmed', async () => {
      const confirmedTx = { ...testData.txResponse, confirmations: 1 };
      mockAxiosGet(confirmedTx);

      const result = await network.isTxInMempool(testData.txId);

      expect(result).toBe(false);
    });

    /**
     * @target `DogeBlockcypherNetwork.isTxInMempool` should return false when transaction is not found
     * @dependencies
     * @scenario
     * - mock axios to throw 404 error
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when transaction is not found', async () => {
      mockAxiosGetToThrow({
        response: {
          status: 404,
          data: 'Transaction not found',
        },
      });

      const result = await network.isTxInMempool(testData.txId);

      expect(result).toBe(false);
    });
  });

  /**
   * @target `DogeBlockcypherNetwork` should properly initialize with axios-rate-limit
   * @dependencies
   * @scenario
   * - verify that the network is initialized correctly
   * @expected
   * - axios.create should be called with the correct URL
   * - client should be properly initialized
   */
  it('should initialize properly', () => {
    // eslint-disable-next-line vitest/prefer-called-exactly-once-with
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'blockcypher-url',
    });

    // Verify the client is an AxiosInstance
    expect(network['client']).toBeDefined();
    expect(network['client'].get).toBeDefined();
    expect(network['client'].post).toBeDefined();

    // Verify mock rate limit was correctly configured with default RPS 3
    expect(axiosInstance.getMaxRPS()).toBe(3);
  });

  /**
   * @target `DogeBlockcypherNetwork` should accept custom rate limit parameter
   * @dependencies
   * @scenario
   * - create a network with a custom RPS
   * - verify the network initializes correctly
   * @expected
   * - should initialize successfully with a custom RPS of 5
   */
  it('should accept a custom rate limit parameter', () => {
    resetAxiosMock();
    const customNetwork = new DogeBlockcypherNetwork(
      'blockcypher-url',
      async () => undefined,
      undefined,
      5, // custom RPS of 5
    );

    // Verify the network was created successfully
    expect(customNetwork).toBeInstanceOf(DogeBlockcypherNetwork);
    // eslint-disable-next-line vitest/prefer-called-exactly-once-with
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'blockcypher-url',
    });

    // Verify mock rate limit was correctly configured with custom RPS 5
    expect(axiosInstance.getMaxRPS()).toBe(5);
  });

  describe('getActualTxId', () => {
    /**
     * @target `DogeBlockcypherNetwork.getActualTxId` should fetch txId using unsigned hash successfully
     * @dependencies
     * @scenario
     * - create a new instance of DogeBlockcypherNetwork with a custom getSavedTransactionById
     * - run test
     * - check returned value
     * @expected
     * - it should fetch txId using unsigned hash successfully
     */
    it('should fetch txId using unsigned hash successfully', async () => {
      // Create a new instance of DogeBlockcypherNetwork with a custom getSavedTransactionById
      const dogePayment = new PaymentTransaction(
        'doge',
        testData.unsignedTxId,
        'eventId',
        Buffer.from(testData.dogePaymentBytes, 'hex'),
        TransactionType.payment,
      );

      const customNetwork = new DogeBlockcypherNetwork(
        'blockcypher-url',
        async (txId: string) => {
          if (txId === testData.unsignedTxId) {
            return dogePayment;
          }
          return undefined;
        },
      );

      // Mock getSpentTransactionByInputId to return a transaction when called with the correct input
      const getSpentTransactionByInputIdSpy = vi
        .spyOn(customNetwork as any, 'getSpentTransactionByInputId')
        .mockResolvedValue(testData.dogeTx);

      mockAxiosGet(testData.txResponse);

      const result = await customNetwork.getActualTxId(testData.unsignedTxId);

      // eslint-disable-next-line vitest/prefer-called-exactly-once-with
      expect(getSpentTransactionByInputIdSpy).toHaveBeenCalledWith(
        testData.dogeTx.inputs[0].index,
        testData.dogeTx.inputs[0].txId,
      );
      expect(result).toEqual(testData.txId);
    });
  });
});
