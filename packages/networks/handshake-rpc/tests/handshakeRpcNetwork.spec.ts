import { FailedError } from '@rosen-chains/abstract-chain';

import { HandshakeRpcNetwork } from '../lib/handshakeRpcNetwork';
import {
  mockAxiosPost,
  mockAxiosPostToThrow,
  resetAxiosMock,
} from './mocked/rateLimitedAxios.mock';
import * as testData from './testData';

describe('HandshakeRpcNetwork', () => {
  const URL = 'handshake-rpc-url';

  beforeEach(() => {
    resetAxiosMock();
  });

  describe('getHeight', () => {
    /**
     * @target `HandshakeRpcNetwork.getHeight` should return block height successfully
     * @dependencies
     * @scenario
     * - mock axios to return blockchain info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return block height successfully', async () => {
      mockAxiosPost(testData.chainInfo);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeight);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `HandshakeRpcNetwork.getTxConfirmation` should return tx confirmation successfully
     * @dependencies
     * @scenario
     * - mock axios to return blockchain info (height)
     * - mock axios to return transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked height minus mocked tx height
     */
    it('should return tx confirmation successfully', async () => {
      mockAxiosPost(testData.chainInfo);
      mockAxiosPost(testData.rpcTxResponse);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.txConfirmation);
    });

    /**
     * @target `HandshakeRpcNetwork.getTxConfirmation` should return -1
     * when transaction is not found
     * @dependencies
     * @scenario
     * - mock axios to return blockchain info
     * - mock axios to throw not found error
     * - run test
     * - check returned value
     * @expected
     * - it should be -1
     */
    it('should return -1 when transaction is not found', async () => {
      mockAxiosPost(testData.chainInfo);
      mockAxiosPostToThrow({
        response: {
          status: 404,
          data: { error: { message: 'Transaction not found' } },
        },
      });

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });

    /**
     * @target `HandshakeRpcNetwork.getTxConfirmation` should return -1
     * when transaction is unconfirmed
     * @dependencies
     * @scenario
     * - mock axios to return blockchain info
     * - mock axios to return unconfirmed tx
     * - run test
     * - check returned value
     * @expected
     * - it should be -1
     */
    it('should return -1 when transaction is unconfirmed', async () => {
      mockAxiosPost(testData.chainInfo);
      mockAxiosPost(testData.unconfirmedRpcTxResponse);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `HandshakeRpcNetwork.getBlockTransactionIds` should return block tx ids successfully
     * @dependencies
     * @scenario
     * - mock axios to return block summary
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx ids from block
     */
    it('should return block tx ids successfully', async () => {
      mockAxiosPost(testData.blockSummary);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockSummary.tx);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `HandshakeRpcNetwork.getBlockInfo` should return block info successfully
     * @dependencies
     * @scenario
     * - mock axios to return block summary
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block info
     */
    it('should return block info successfully', async () => {
      mockAxiosPost(testData.blockSummary);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `HandshakeRpcNetwork.getTransaction` should return transaction successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx in HandshakeTx format
     */
    it('should return transaction successfully', async () => {
      mockAxiosPost(testData.rpcTxResponse);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.handshakeTx);
    });

    /**
     * @target `HandshakeRpcNetwork.getTransaction` should return the transaction with non-zero covenant outputs successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction with a non-zero covenant output
     * - run test
     * - check returned value
     * @expected
     * - it should return the transaction with non-zero covenant outputs successfully
     */
    it('should return the transaction with non-zero covenant outputs successfully', async () => {
      mockAxiosPost(testData.rpcTxWithNonZeroCovenant);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getTransaction(
        testData.rpcTxWithNonZeroCovenant.txid,
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.handshakeTxWithNonZeroCovenant);
    });

    /**
     * @target `HandshakeRpcNetwork.getTransaction` should throw error when
     * block id is not matched with tx block
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test with wrong block hash and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when block id is not matched with tx block', async () => {
      mockAxiosPost(testData.rpcTxResponse);

      const network = new HandshakeRpcNetwork(URL);
      await expect(async () => {
        await network.getTransaction(
          testData.txId,
          'wrongblockhash0000000000000000000000000000000000000000000000',
        );
      }).rejects.toThrow(FailedError);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `HandshakeRpcNetwork.isBoxUnspentAndValid` should return true when box is unspent
     * @dependencies
     * @scenario
     * - mock axios to return getTxOut response
     * - run test with valid box id
     * - check returned value
     * @expected
     * - it should be true
     */
    it('should return true when box is unspent', async () => {
      mockAxiosPost(testData.getTxOutResponse);

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.0`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(true);
    });

    /**
     * @target `HandshakeRpcNetwork.isBoxUnspentAndValid` should return false when
     * box is spent (gettxout returns null)
     * @dependencies
     * @scenario
     * - mock axios to return null
     * - run test
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when box is spent', async () => {
      mockAxiosPost(null);

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.0`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });

    /**
     * @target `HandshakeRpcNetwork.isBoxUnspentAndValid` should return true when
     * box has a non-zero covenant but is still unspent
     * @dependencies
     * @scenario
     * - mock axios to return getTxOut response with a non-zero covenant
     * - run test
     * - check returned value
     * @expected
     * - it should be true because this function only checks unspent status
     */
    it('should return true when box has a non-zero covenant but is unspent', async () => {
      mockAxiosPost(testData.getTxOutResponseWithNonZeroCovenant);

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.0`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(true);
    });

    /**
     * @target `HandshakeRpcNetwork.isBoxUnspentAndValid` should return false when
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
      mockAxiosPostToThrow({
        response: {
          status: 404,
          data: { error: { code: -5, message: 'Transaction not found' } },
        },
      });

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.0`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `HandshakeRpcNetwork.getUtxo` should return utxo successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxo
     */
    it('should return utxo successfully', async () => {
      mockAxiosPost(testData.rpcTxResponse);

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.0`;
      const result = await network.getUtxo(boxId);

      expect(result).toEqual(testData.utxo);
    });

    /**
     * @target `HandshakeRpcNetwork.getUtxo` should throw error when
     * tx is not found
     * @dependencies
     * @scenario
     * - mock axios to throw not found error
     * - run test and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when tx is not found', async () => {
      mockAxiosPostToThrow({
        response: {
          status: 404,
          data: { error: { message: 'Transaction not found' } },
        },
      });

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.0`;
      await expect(async () => {
        await network.getUtxo(boxId);
      }).rejects.toThrow(FailedError);
    });

    /**
     * @target `HandshakeRpcNetwork.getUtxo` should throw error when
     * box index is more than number of tx outputs
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test with invalid index and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when box index is more than number of tx outputs', async () => {
      mockAxiosPost(testData.rpcTxResponse);

      const network = new HandshakeRpcNetwork(URL);
      const boxId = `${testData.txId}.10`;
      await expect(async () => {
        await network.getUtxo(boxId);
      }).rejects.toThrow(FailedError);
    });
  });

  describe('getFeeRatio', () => {
    /**
     * @target `HandshakeRpcNetwork.getFeeRatio` should return fee ratio successfully
     * @dependencies
     * @scenario
     * - mock axios to return fee estimates
     * - run test
     * - check returned value
     * @expected
     * - it should be fee estimation for 6 confirmation blocks
     */
    it('should return fee ratio successfully', async () => {
      mockAxiosPost(testData.estimateFeeResponse);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getFeeRatio();

      expect(result).toBeCloseTo(testData.targetFeeEstimation, 6);
    });
  });

  describe('getMempoolTxIds', () => {
    /**
     * @target `HandshakeRpcNetwork.getMempoolTxIds` should return mempool tx ids successfully
     * @dependencies
     * @scenario
     * - mock axios to return mempool tx ids
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked mempool tx ids
     */
    it('should return mempool tx ids successfully', async () => {
      mockAxiosPost(testData.txIds);

      const network = new HandshakeRpcNetwork(URL);
      const result = await network.getMempoolTxIds();

      expect(result).toEqual(testData.txIds);
    });
  });
});
