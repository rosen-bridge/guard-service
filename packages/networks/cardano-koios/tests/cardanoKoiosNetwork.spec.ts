import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';

import JsonBigInt from '@rosen-bridge/json-bigint';

import CardanoKoiosNetwork from '../lib';
import {
  mockAddressAssets,
  mockEmptyAddressAssets,
  mockEpochParams,
  mockTip,
  mockNoHistoryAddressAssets,
  mockAddressInfo,
  mockAddressInfoNoHistory,
  mockAssetInfo,
  mockBlockInfo,
  mockBlockTxs,
  mockSubmitTx,
  mockTxCbor,
  mockTxStatus,
  mockUtxoValidation,
} from './mocked/cardanoKoiosClient.mock';
import * as testData from './testData';

vi.mock('@rosen-clients/cardano-koios');

describe('CardanoKoiosNetwork', () => {
  const mockNetwork = () => new CardanoKoiosNetwork('https://test.url');

  describe('getHeight', () => {
    /**
     * @target `CardanoKoiosNetwork.getHeight` should return current block height
     * @dependencies
     * @scenario
     * - mock `tip` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return current block height', async () => {
      // mock client response
      mockTip();

      // run test
      const network = mockNetwork();
      const result = await network.getHeight();

      // check returned value
      expect(result).toEqual(Number(testData.blockHeight));
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `CardanoKoiosNetwork.getTxConfirmation` should return tx confirmation
     * @dependencies
     * @scenario
     * - mock `txStatus` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx confirmation
     */
    it('should return tx confirmation', async () => {
      // mock client response
      const mockedConfirmation = 100n;
      mockTxStatus(testData.txId, mockedConfirmation);

      // run test
      const network = mockNetwork();
      const result = await network.getTxConfirmation(testData.txId);

      // check returned value
      expect(result).toEqual(Number(mockedConfirmation));
    });

    /**
     * @target `CardanoKoiosNetwork.getTxConfirmation` should return -1
     * when transaction is not found
     * @dependencies
     * @scenario
     * - mock `txStatus` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be -1
     */
    it('should return -1 when transaction is not found', async () => {
      // mock client response
      const mockedConfirmation = null;
      mockTxStatus(testData.txId, mockedConfirmation);

      // run test
      const network = mockNetwork();
      const result = await network.getTxConfirmation(testData.txId);

      // check returned value
      expect(result).toEqual(-1);
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target `CardanoKoiosNetwork.getAddressAssets` should return address assets
     * @dependencies
     * @scenario
     * - mock `addressInfo` and `addressAssets` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked assets
     */
    it('should return address assets', async () => {
      // mock client response
      mockAddressAssets();

      // run test
      const network = mockNetwork();
      const result = await network.getAddressAssets(testData.address);

      // check returned value
      expect(result).toEqual({
        nativeToken: BigInt(testData.addressBalance),
        tokens: testData.addressAssets.map((asset) => ({
          id: `${asset.policy_id}.${asset.asset_name}`,
          value: BigInt(asset.quantity),
        })),
      });
    });

    /**
     * @target `CardanoKoiosNetwork.getAddressAssets` should return address assets
     * even when address has no assets
     * @dependencies
     * @scenario
     * - mock `addressInfo` and `addressAssets` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked assets
     */
    it('should return address assets even when address has no assets', async () => {
      // mock client response
      mockEmptyAddressAssets();

      // run test
      const network = mockNetwork();
      const result = await network.getAddressAssets(testData.address);

      // check returned value
      expect(result).toEqual({
        nativeToken: 0n,
        tokens: [],
      });
    });

    /**
     * @target `CardanoKoiosNetwork.getAddressAssets` should return address assets
     * even when address has no history of transactions
     * @dependencies
     * @scenario
     * - mock `addressInfo` and `addressAssets` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked assets
     */
    it('should return address assets even when address has no history of transactions', async () => {
      // mock client response
      mockNoHistoryAddressAssets();

      // run test
      const network = mockNetwork();
      const result = await network.getAddressAssets(testData.address);

      // check returned value
      expect(result).toEqual({
        nativeToken: 0n,
        tokens: [],
      });
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `CardanoKoiosNetwork.getBlockTransactionIds` should return
     * id of block transactions
     * @dependencies
     * @scenario
     * - mock `blockTxs` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked transaction hashes
     */
    it('should return id of block transactions', async () => {
      // mock client response
      mockBlockTxs();

      // run test
      const network = mockNetwork();
      const result = await network.getBlockTransactionIds(testData.blockId);

      // check returned value
      expect(result).toEqual(testData.txHashes.map((block) => block.tx_hash));
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `CardanoKoiosNetwork.getBlockInfo` should return
     * block hash, parent hash and height
     * @dependencies
     * @scenario
     * - mock `blockInfo` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block info
     */
    it('should return block hash, parent hash and height', async () => {
      // mock client response
      mockBlockInfo();

      // run test
      const network = mockNetwork();
      const result = await network.getBlockInfo(testData.blockId);

      // check returned value
      expect(result).toEqual({
        hash: testData.blockId,
        height: Number(testData.oldBlockheight),
        parentHash: testData.parentBlockId,
      });
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `CardanoKoiosNetwork.getTransaction` should return transaction
     * with no metadata
     * @dependencies
     * @scenario
     * - mock `txCbor` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked transaction
     */
    it('should return transaction with no metadata', async () => {
      // mock client response
      mockTxCbor(testData.noMetadataTxKoiosResponse);

      // run test
      const network = mockNetwork();
      const result = await network.getTransaction(
        testData.noMetadataTxId,
        testData.noMetadataTxBlockId,
      );

      // check returned value
      expect(JsonBigInt.stringify(result)).toEqual(
        testData.expectedNoMetadataTxResponse,
      );
    });

    /**
     * @target `CardanoKoiosNetwork.getTransaction` should return transaction
     * with rosen metadata
     * @dependencies
     * @scenario
     * - mock `txCbor` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked transaction
     */
    it('should return transaction with rosen metadata', async () => {
      // mock client response
      mockTxCbor(testData.rosenMetadataTxKoiosResponse);

      // run test
      const network = mockNetwork();
      const result = await network.getTransaction(
        testData.rosenMetadataTxId,
        testData.rosenMetadataTxBlockId,
      );

      // check returned value
      expect(JsonBigInt.stringify(result)).toEqual(
        testData.expectedRosenMetadataTxResponse,
      );
    });

    /**
     * @target `CardanoKoiosNetwork.getTransaction` should return transaction
     * with different metadata
     * @dependencies
     * @scenario
     * - mock `txCbor` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked transaction
     */
    it('should return transaction with different metadata', async () => {
      // mock client response
      mockTxCbor(testData.differentMetadataTxKoiosResponse);

      // run test
      const network = mockNetwork();
      const result = await network.getTransaction(
        testData.differentMetadataTxId,
        testData.differentnoMetadataTxBlockId,
      );

      // check returned value
      expect(JsonBigInt.stringify(result)).toEqual(
        testData.expectedDifferentMetadataTxResponse,
      );
    });
  });

  describe('submitTransaction', () => {
    /**
     * @target `CardanoKoiosNetwork.submitTransaction` should submit transaction successfully
     * @dependencies
     * @scenario
     * - mock transaction
     * - mock `submittx` of cardano koios client
     * - run test
     * @expected
     * - function execution finish without any error
     */
    it('should submit transaction successfully', async () => {
      // mock transaction
      const tx = Transaction.from_hex(testData.txBytes);

      // mock client response
      mockSubmitTx();

      // run test
      const network = mockNetwork();
      const result = network.submitTransaction(tx);
      await expect(result).resolves.not.toThrow();
    });
  });

  describe('getMempoolTransactions', () => {
    /**
     * @target `CardanoKoiosNetwork.getMempoolTransactions` should return empty list
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list', async () => {
      // run test
      const network = mockNetwork();
      const result = await network.getMempoolTransactions();

      // check returned value
      expect(result).toEqual([]);
    });
  });

  describe('getAddressBoxes', () => {
    /**
     * @target `CardanoKoiosNetwork.getAddressBoxes` should return address Utxos
     * @dependencies
     * @scenario
     * - mock `addressInfo` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos
     */
    it('should return address Utxos', async () => {
      // mock client response
      mockAddressInfo(testData.addressUtxoSet);

      // run test
      const network = mockNetwork();
      const result = await network.getAddressBoxes(testData.address, 0, 100);

      // check returned value
      expect(result.map((box) => JsonBigInt.stringify(box))).toEqual(
        testData.expectedAdressUtxoSet,
      );
    });

    /**
     * @target `CardanoKoiosNetwork.getAddressBoxes` should return empty
     * list when address has no boxes
     * @dependencies
     * @scenario
     * - mock `addressInfo` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when address has no boxes', async () => {
      // mock client response
      mockAddressInfo([]);

      // run test
      const network = mockNetwork();
      const result = await network.getAddressBoxes(testData.address, 0, 100);

      // check returned value
      expect(result.map((box) => JsonBigInt.stringify(box))).toEqual([]);
    });

    /**
     * @target `CardanoKoiosNetwork.getAddressBoxes` should return empty
     * list when address has no history of transactions
     * @dependencies
     * @scenario
     * - mock `addressInfo` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when address has no history of transactions', async () => {
      // mock client response
      mockAddressInfoNoHistory();

      // run test
      const network = mockNetwork();
      const result = await network.getAddressBoxes(testData.address, 0, 100);

      // check returned value
      expect(result.map((box) => JsonBigInt.stringify(box))).toEqual([]);
    });

    /**
     * @target `CardanoKoiosNetwork.getAddressBoxes` should return empty
     * list when offset is more than boxes
     * @dependencies
     * @scenario
     * - mock `addressInfo` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when offset is more than boxes', async () => {
      // mock client response
      mockAddressInfo(testData.addressUtxoSet);

      // run test
      const network = mockNetwork();
      const result = await network.getAddressBoxes(testData.address, 5, 100);

      // check returned value
      expect(result.map((box) => JsonBigInt.stringify(box))).toEqual([]);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `CardanoKoiosNetwork.isBoxUnspentAndValid` should return true
     * when box is unspent and valid
     * @dependencies
     * @scenario
     * - mock `txCbor` and `credentialUtxos` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be true
     */
    it('should return true when box is unspent and valid', async () => {
      // mock client response
      mockUtxoValidation(
        testData.unspentUtxoTxKoiosResponse,
        testData.credentialUtxos,
      );

      // run test
      const network = mockNetwork();
      const result = await network.isBoxUnspentAndValid(testData.unspentBoxId);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target `CardanoKoiosNetwork.isBoxUnspentAndValid` should return false
     * when box is spent
     * @dependencies
     * @scenario
     * - mock `txCbor` and `credentialUtxos` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when box is spent', async () => {
      // mock client response
      mockUtxoValidation(
        testData.rosenMetadataTxKoiosResponse,
        testData.credentialUtxos,
      );

      // run test
      const network = mockNetwork();
      const result = await network.isBoxUnspentAndValid(testData.boxId);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target `CardanoKoiosNetwork.isBoxUnspentAndValid` should return false
     * when box is invalid (source tx is not found)
     * @dependencies
     * @scenario
     * - mock `txCbor` and `credentialUtxos` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when box is invalid', async () => {
      // mock client response
      mockUtxoValidation(undefined, testData.credentialUtxos);

      // run test
      const network = mockNetwork();
      const result = await network.isBoxUnspentAndValid(testData.boxId);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('currentSlot', () => {
    /**
     * @target `CardanoKoiosNetwork.currentSlot` should return current slot
     * @dependencies
     * @scenario
     * - mock `tip` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked slot
     */
    it('should return current slot', async () => {
      // mock client response
      mockTip();

      // run test
      const network = mockNetwork();
      const result = await network.currentSlot();

      // check returned value
      expect(result).toEqual(Number(testData.absoluteSlot));
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `CardanoKoiosNetwork.getUtxo` should return utxo successfully
     * @dependencies
     * @scenario
     * - mock `txCbor` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxo
     */
    it('should return utxo successfully', async () => {
      // mock client response
      mockTxCbor(testData.rosenMetadataTxKoiosResponse);

      // run test
      const network = mockNetwork();
      const result = await network.getUtxo(testData.boxId);

      // check returned value
      expect(result).toEqual(testData.expectedUtxo);
    });
  });

  describe('getProtocolParameters', () => {
    /**
     * @target `CardanoKoiosNetwork.getProtocolParameters` should return required parameters
     * @dependencies
     * @scenario
     * - mock `epochParams` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked slot
     */
    it('should return required parameters', async () => {
      // mock client response
      mockEpochParams();

      // run test
      const network = mockNetwork();
      const result = await network.getProtocolParameters();

      // check returned value
      expect(result).toEqual(testData.expectedRequiredParams);
    });
  });

  describe('getTokenDetail', () => {
    /**
     * @target `CardanoKoiosNetwork.getTokenDetail` should return token detail successfully
     * @dependencies
     * @scenario
     * - mock `assetInfo` of cardano koios client
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked token data
     */
    it('should return token detail successfully', async () => {
      // mock client response
      mockAssetInfo();

      // run test
      const network = mockNetwork();
      const result = await network.getTokenDetail(testData.assetId);

      // check returned value
      expect(result).toEqual(testData.expectedTokenDetail);
    });
  });
});
