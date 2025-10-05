import { FailedError } from '@rosen-chains/abstract-chain';
import { BitcoinRunesRpcNetwork } from '../lib/bitcoinRunesRpcNetwork';
import {
  ClientType,
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPostToThrow,
  resetAxiosMock,
} from './mocked/axios.mock';
import * as testData from './testData';

describe('BitcoinRunesRpcNetwork', () => {
  let network: BitcoinRunesRpcNetwork;

  beforeEach(() => {
    resetAxiosMock();
    network = new BitcoinRunesRpcNetwork(
      { url: 'rpc-url' },
      { url: 'unisat-url' }
    );
    vi.spyOn(network as any, 'generateRandomId').mockReturnValue(
      testData.requestId
    );
  });

  describe('getHeight', () => {
    /**
     * @target `BitcoinEsploraNetwork.getHeight` should return block height successfully
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getblockchaininfo' response
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked block height
     */
    it('should return block height successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.blockchainInfoResponse);

      const result = await network.getHeight();

      expect(result).toEqual(testData.blockHeight);
    });
  });

  describe('getTxConfirmation', () => {
    /**
     * @target `BitcoinEsploraNetwork.getTxConfirmation` should return tx confirmation successfully
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getrawtransaction' response
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked height minus mocked tx height
     */
    it('should return tx confirmation successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.rawTransactionResponse);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(testData.txConfirmation);
    });

    /**
     * @target `BitcoinEsploraNetwork.getTxConfirmation` should return -1
     * when transaction is not found
     * @dependencies
     * @scenario
     * - mock RPC axios to throw error
     * - run test
     * - check returned value
     * @expected
     * - it should be -1
     */
    it('should return -1 when transaction is not found', async () => {
      mockAxiosPostToThrow(ClientType.RPC, testData.rawTransactionError);

      const result = await network.getTxConfirmation(testData.txId);

      expect(result).toEqual(-1);
    });
  });

  describe('getAddressAssets', () => {
    /**
     * @target `BitcoinEsploraNetwork.getAddressAssets` should return address assets successfully
     * @dependencies
     * @scenario
     * - mock Unisat axios to return address balance response
     * - mock Unisat axios to return address Runes balance response
     * - run test
     * - check returned value
     * @expected
     * - it should be expected BTC balance and Runes
     */
    it('should return address assets successfully', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressBalanceReponse);
      mockAxiosGet(
        ClientType.UNISAT,
        testData.unisatAddressRunesBalanceReponse
      );

      const result = await network.getAddressAssets(testData.address);

      expect(result).toEqual(testData.addressBalance);
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressAssets` should return 0 balance
     * when address has no BTC
     * @dependencies
     * @scenario
     * - mock Unisat axios to return address balance response with zero BTC
     * - run test
     * - check returned value
     * @expected
     * - it should be zero native tokens with no tokens
     */
    it('should return 0 balance when address has no BTC', async () => {
      mockAxiosGet(
        ClientType.UNISAT,
        testData.unisatAddressEmptyBalanceReponse
      );
      mockAxiosGet(
        ClientType.UNISAT,
        testData.unisatAddressEmptyRunesBalanceReponse
      );

      const result = await network.getAddressAssets(testData.address);

      expect(result).toEqual({ nativeToken: 0n, tokens: [] });
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressAssets` should return correct balance
     * when address has only BTC
     * @dependencies
     * @scenario
     * - mock Unisat axios to return address balance response
     * - mock Unisat axios to return address Runes balance response with empty list
     * - run test
     * - check returned value
     * @expected
     * - it should be expected BTC balance with no tokens
     */
    it('should return correct balance when address has only BTC', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressBalanceReponse);
      mockAxiosGet(
        ClientType.UNISAT,
        testData.unisatAddressEmptyRunesBalanceReponse
      );

      const result = await network.getAddressAssets(testData.address);

      expect(result).toEqual({
        nativeToken: testData.addressBalance.nativeToken,
        tokens: [],
      });
    });
  });

  describe('getBlockTransactionIds', () => {
    /**
     * @target `BitcoinEsploraNetwork.getBlockTransactionIds` should return block transaction ids successfully
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getblock' response
     * - run test
     * - check returned value
     * @expected
     * - it should be expected id list
     */
    it('should return block transaction ids successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.blockResponse);

      const result = await network.getBlockTransactionIds(testData.blockHash);

      expect(result).toEqual(testData.blockTxIds);
    });
  });

  describe('getBlockInfo', () => {
    /**
     * @target `BitcoinEsploraNetwork.getBlockInfo` should return block info successfully
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getblock' response
     * - run test
     * - check returned value
     * @expected
     * - it should be expected info
     */
    it('should return block info successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.blockResponse);

      const result = await network.getBlockInfo(testData.blockHash);

      expect(result).toEqual(testData.blockInfo);
    });
  });

  describe('getTransaction', () => {
    /**
     * @target `BitcoinEsploraNetwork.getTransaction` should return transaction successfully
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getrawtransaction' response
     * - mock Unisat axios to return Runes event
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked tx in BitcoinTx format
     */
    it('should return transaction successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.lockTxRawTransactionResponse);
      mockAxiosPost(ClientType.RPC, testData.blockResponse);
      mockAxiosGet(ClientType.UNISAT, testData.lockTxRunesEventResponse);

      const result = await network.getTransaction(
        testData.lockTxId,
        testData.lockTxBlockHash
      );

      expect(result).toEqual(testData.lockTx);
    });

    /**
     * @target `BitcoinEsploraNetwork.getTransaction` should throw error when
     * block id is not matched with tx block
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getrawtransaction' response
     * - mock Unisat axios to return Runes event
     * - run test with wrong block hash and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when block id is not matched with tx block', async () => {
      mockAxiosPost(ClientType.RPC, testData.lockTxRawTransactionResponse);
      mockAxiosGet(ClientType.UNISAT, testData.lockTxRunesEventResponse);

      await expect(async () => {
        await network.getTransaction(testData.lockTxId, testData.blockHash);
      }).rejects.toThrow(FailedError);
    });
  });

  describe('getTokenDetail', () => {
    /**
     * @target `BitcoinEsploraNetwork.getTokenDetail` should return token detail successfully
     * @dependencies
     * @scenario
     * - mock Unisat axios to return Runes info
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked token data
     */
    it('should return token detail successfully', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatRunesInfoResponse);

      const result = await network.getTokenDetail(testData.runeId);

      expect(result).toEqual(testData.expectedTokenDetail);
    });

    /**
     * @target `BitcoinEsploraNetwork.getTokenDetail` should throw error when rune is not found
     * @dependencies
     * @scenario
     * - mock Unisat axios to return null
     * - run test and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when rune is not found', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatNullResponse);

      await expect(async () => {
        await network.getTokenDetail(testData.runeId);
      }).rejects.toThrow(FailedError);
    });
  });

  describe('isBoxUnspentAndValid', () => {
    /**
     * @target `BitcoinEsploraNetwork.isBoxUnspentAndValid` should return true when box is unspent
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'gettxout' response
     * - run test with unspent box index
     * - check returned value
     * @expected
     * - it should be true
     */
    it('should return true when box is unspent', async () => {
      mockAxiosPost(ClientType.RPC, testData.txOutResponse);

      const boxId = `${testData.txId}.${0}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(true);
    });

    /**
     * @target `BitcoinEsploraNetwork.isBoxUnspentAndValid` should return false when
     * box is spent or invalid
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'gettxout' response
     * - run test with spent box index
     * - check returned value
     * @expected
     * - it should be false
     */
    it('should return false when box is spent or invalid', async () => {
      mockAxiosPost(ClientType.RPC, testData.spentTxOutResponse);

      const boxId = `${testData.txId}.${0}`;
      const result = await network.isBoxUnspentAndValid(boxId);

      expect(result).toEqual(false);
    });
  });

  describe('getUtxo', () => {
    /**
     * @target `BitcoinEsploraNetwork.getUtxo` should return utxo successfully
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getrawtransaction' response
     * - mock Unisat axios to return utxo Runes balance
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxo
     */
    it('should return utxo successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.runeUtxoRawTransactionResponse);
      mockAxiosGet(ClientType.UNISAT, testData.unisatUtxoRunesBalance);

      const result = await network.getUtxo(testData.utxoId);

      expect(result).toEqual(testData.runesUtxo);
    });

    /**
     * @target `BitcoinEsploraNetwork.getUtxo` should throw error when
     * tx is not found
     * @dependencies
     * @scenario
     * - mock RPC axios to throw error
     * - run test and expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when tx is not found', async () => {
      mockAxiosPostToThrow(ClientType.RPC, testData.rawTransactionError);

      await expect(async () => {
        await network.getUtxo(testData.utxoId);
      }).rejects.toThrow(FailedError);
    });

    /**
     * @target `BitcoinEsploraNetwork.getUtxo` should throw error when
     * box index is more than number of tx outputs
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getrawtransaction' response
     * - run test expect exception thrown
     * @expected
     * - it should throw FailedError
     */
    it('should throw error when box index is more than number of tx outputs', async () => {
      mockAxiosPost(ClientType.RPC, testData.runeUtxoRawTransactionResponse);

      const boxId = `${
        testData.runeUtxoRawTransactionResponse.result.txid
      }.${5}`;
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
     * - mock RPC axios to return 'estimatesmartfee' response
     * - run test
     * - check returned value
     * @expected
     * - it should be fee estimation for 6 confirmation
     */
    it('should return fee ratio successfully', async () => {
      mockAxiosPost(ClientType.RPC, testData.feeRatioResponse);

      const result = await network.getFeeRatio();

      expect(result).toEqual(testData.feeRatio);
    });
  });

  describe('isTxInMempool', () => {
    /**
     * @target `BitcoinEsploraNetwork.isTxInMempool` should return true when tx is in mempool
     * @dependencies
     * @scenario
     * - mock RPC axios to return 'getmempoolentry' response
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when tx is in mempool', async () => {
      mockAxiosPost(ClientType.RPC, testData.mempoolEntryResponse);

      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(true);
    });

    /**
     * @target `BitcoinEsploraNetwork.isTxInMempool` should return false when tx is not in mempool
     * @dependencies
     * @scenario
     * - mock RPC axios to throw error
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when tx is not in mempool', async () => {
      mockAxiosPostToThrow(ClientType.RPC, testData.mempoolEntryError);

      const result = await network.isTxInMempool(testData.txId);

      expect(result).toEqual(false);
    });
  });

  describe('getAddressRunesBoxes', () => {
    /**
     * @target `BitcoinEsploraNetwork.getAddressRunesBoxes` should return address utxos successfully
     * @dependencies
     * @scenario
     * - mock Unisat axios to return address Runes utxos
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in BitcoinRunesUtxo format
     */
    it('should return address utxos successfully', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressRunesUtxos);

      const result = await network.getAddressRunesBoxes(
        testData.address,
        testData.runeId,
        0,
        100
      );

      expect(result).toEqual(testData.addressRunesUtxos);
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressRunesBoxes` should return empty list
     * when no utxo is returned
     * @dependencies
     * @scenario
     * - mock Unisat axios to return empty list for address Runes utxos
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when no utxo is returned', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressRunesWithoutUtxos);

      const result = await network.getAddressRunesBoxes(
        testData.address,
        testData.runeId,
        0,
        100
      );

      expect(result).toEqual([]);
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressRunesBoxes` should return empty list
     * when address is invalid
     * @dependencies
     * @scenario
     * - mock Unisat axios to return response with error
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when address is invalid', async () => {
      mockAxiosGet(
        ClientType.UNISAT,
        testData.addressRunesUtxosWithInvalidAddress
      );

      const result = await network.getAddressRunesBoxes(
        testData.invalidAddress,
        testData.runeId,
        0,
        100
      );

      expect(result).toEqual([]);
    });
  });

  describe('getAddressBtcBoxes', () => {
    /**
     * @target `BitcoinEsploraNetwork.getAddressBtcBoxes` should return address utxos successfully
     * @dependencies
     * @scenario
     * - mock Unisat axios to return address available utxos
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in BitcoinRunesUtxo format
     */
    it('should return address utxos successfully', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressAvailableUtxoData);

      const result = await network.getAddressBtcBoxes(testData.address);

      expect(result).toEqual(testData.btcUtxos);
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressBtcBoxes` should return empty list
     * when no utxo is returned
     * @dependencies
     * @scenario
     * - mock Unisat axios to return empty list for available utxos
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when no utxo is returned', async () => {
      mockAxiosGet(
        ClientType.UNISAT,
        testData.unisatAddressEmptyAvailableUtxoData
      );

      const result = await network.getAddressBtcBoxes(testData.address);

      expect(result).toEqual([]);
    });

    /**
     * @target `BitcoinEsploraNetwork.getAddressBtcBoxes` should return empty list
     * when address is invalid
     * @dependencies
     * @scenario
     * - mock Unisat axios to return response with error
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when address is invalid', async () => {
      mockAxiosGet(
        ClientType.UNISAT,
        testData.unisatInvalidAddressAvailableUtxoData
      );

      const result = await network.getAddressBtcBoxes(testData.invalidAddress);

      expect(result).toEqual([]);
    });
  });

  describe('getRemainingBoxes', () => {
    /**
     * @target `BitcoinEsploraNetwork.getRemainingBoxes` should return remaining utxos successfully
     * @dependencies
     * @scenario
     * - mock Unisat axios to return address all utxos
     * - mock Unisat axios to return utxo Runes balance for all utxos returned in previous API
     * - run test
     * - check returned value
     * @expected
     * - it should be mocked utxos in BitcoinRunesUtxo format
     */
    it('should return address utxos successfully', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressAllUtxoData);
      testData.unisatUtxoRunesBalanceForAllUtxos.forEach((response) => {
        mockAxiosGet(ClientType.UNISAT, response);
      });

      const result = await network.getRemainingBoxes(
        [testData.alreadyFetchedUtxoId],
        testData.address
      );

      expect(result).toEqual(testData.remainingUtxos);
    });

    /**
     * @target `BitcoinEsploraNetwork.getRemainingBoxes` should return empty list
     * when no utxo is returned
     * @dependencies
     * @scenario
     * - mock Unisat axios to return empty list for all utxos
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when no utxo is returned', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatAddressEmptyAllUtxoData);

      const result = await network.getRemainingBoxes([], testData.address);

      expect(result).toEqual([]);
    });

    /**
     * @target `BitcoinEsploraNetwork.getRemainingBoxes` should return empty list
     * when address is invalid
     * @dependencies
     * @scenario
     * - mock Unisat axios to return response with error
     * - run test
     * - check returned value
     * @expected
     * - it should be empty list
     */
    it('should return empty list when address is invalid', async () => {
      mockAxiosGet(ClientType.UNISAT, testData.unisatInvalidAddressAllUtxoData);

      const result = await network.getRemainingBoxes(
        [],
        testData.invalidAddress
      );

      expect(result).toEqual([]);
    });
  });
});
