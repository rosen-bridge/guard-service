import { FailedError } from '@rosen-chains/abstract-chain';

import BitcoinEsploraNetwork from '../lib/bitcoinEsploraNetwork';
import {
  mockAxiosGet,
  mockAxiosGetToThrow,
  resetAxiosMock,
} from './mocked/axios.mock';
import * as testData from './testData';

describe('BitcoinEsploraNetwork', () => {
  let network: BitcoinEsploraNetwork;

  beforeEach(() => {
    resetAxiosMock();
    network = new BitcoinEsploraNetwork('esplora-url');
  });

  describe('getHeight', () => {
    /**
     * @target `BitcoinEsploraNetwork.getHeight` should return block height successfully
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
     * @target `BitcoinEsploraNetwork.getTxConfirmation` should return tx confirmation successfully
     * @dependencies
     * @scenario
     * - mock axios to return height
     * - mock axios to return tx
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked height minus mocked tx height
     */
    it('should return tx confirmation successfully', async () => {
      mockAxiosGet(testData.blockHeight);
      mockAxiosGet(testData.txResponse);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.txConfirmation);
    });

    /**
     * @target `BitcoinEsploraNetwork.getTxConfirmation` should return -1
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
     * @target `BitcoinEsploraNetwork.getTxConfirmation` should return -1
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
  });

  describe('getAddressAssets', () => {
    /**
     * @target `BitcoinEsploraNetwork.getAddressAssets` should return address assets successfully
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info
     * - run test
     * - check returned value
     * @expected
     * - it should be expected BTC balance with no tokens
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
     * @target `BitcoinEsploraNetwork.getAddressAssets` should return 0 balance
     * when address has no BTC
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info with zero balance
     * - run test
     * - check returned value
     * @expected
     * - it should be zero native tokens with no tokens
     */
    it('should return 0 balance when address has no BTC', async () => {
      mockAxiosGet(testData.emptyAddressResponse);

      const result = await network.getAddressAssets(testData.lockAddress);

      expect(result).toEqual({ nativeToken: 0n, tokens: [] });
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressAssets` should return 0 balance
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
     * @target `BitcoinEsploraNetwork.getBlockTransactionIds` should return block tx ids successfully
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
     * @target `BitcoinEsploraNetwork.getBlockInfo` should return block info successfully
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
     * @target `BitcoinEsploraNetwork.getTransaction` should return transaction successfully
     * @dependencies
     * @scenario
     * - mock axios to return transaction
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx in BitcoinTx format
     */
    it('should return transaction successfully', async () => {
      mockAxiosGet(testData.txResponse);

      const result = await network.getTransaction(
        testData.txId,
        testData.txBlockHash,
      );

      expect(result).toEqual(testData.bitcoinTx);
    });

    /**
     * @target `BitcoinEsploraNetwork.getTransaction` should throw error when
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
     * @target `BitcoinEsploraNetwork.getAddressBoxes` should return address utxos successfully
     * @dependencies
     * @scenario
     * - mock axios to return address utxo info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in BitcoinUtxo format
     */
    it('should return address utxos successfully', async () => {
      mockAxiosGet(testData.addressUtxoResponse);

      const result = await network.getAddressBoxes(
        testData.lockAddress,
        0,
        100,
      );

      expect(result).toEqual(testData.addressUtxos);
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressBoxes` should return empty list
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
        100,
      );

      expect(result).toEqual([]);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `BitcoinEsploraNetwork.isBoxUnspentAndValid` should return true when box is unspent
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
     * @target `BitcoinEsploraNetwork.isBoxUnspentAndValid` should return false when
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
     * @target `BitcoinEsploraNetwork.isBoxUnspentAndValid` should return false when
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
     * @target `BitcoinEsploraNetwork.isBoxUnspentAndValid` should return false when
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
     * @target `BitcoinEsploraNetwork.getUtxo` should return utxo successfully
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
     * @target `BitcoinEsploraNetwork.getUtxo` should throw error when
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
     * @target `BitcoinEsploraNetwork.getUtxo` should throw error when
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
     * @target `BitcoinEsploraNetwork.getFeeRatio` should return fee ratio successfully
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
     * @target `BitcoinEsploraNetwork.getMempoolTxIds` should return mempool tx ids successfully
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
});
