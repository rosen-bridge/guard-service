import { expect } from 'chai';
import { beforeEach } from 'mocha';
import CardanoTestBoxes from '../cardano/testUtils/TestBoxes';
import { resetMockedCardanoTrack } from '../mocked/MockedCardanoTrack';
import {
  mockGetAddressBoxes,
  mockKoiosGetAddressAssets,
  mockKoiosGetAddressInfo,
  resetKoiosApiCalls,
} from './mocked/MockedKoios';
import CardanoConfigs from '../../../src/chains/cardano/helpers/CardanoConfigs';
import {
  InputUtxo,
  Utxo,
  UtxoBoxesAssets,
} from '../../../src/chains/cardano/models/Interfaces';
import {
  AssetName,
  Assets,
  BigNum,
  MultiAsset,
  ScriptHash,
} from '@emurgo/cardano-serialization-lib-nodejs';
import CardanoTrack from '../../../src/chains/cardano/CardanoTrack';
import Utils from '../../../src/helpers/Utils';
import TestBoxes from '../cardano/testUtils/TestBoxes';
import CardanoUtils from '../../../src/chains/cardano/helpers/CardanoUtils';
import { Buffer } from 'buffer';
import {
  clearTables,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';
import ErgoTestBoxes from '../ergo/testUtils/TestBoxes';
import { TransactionStatus } from '../../../src/models/Models';
import { mockGetCardanoPendingTransactionsInputs } from '../../guard/mocked/MockedTxAgreement';

describe('CardanoTrack', () => {
  describe('trackAndFilterLockBoxes', () => {
    const testBankAddress = TestBoxes.testBankAddress;
    // mock getting bankBoxes
    const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes();

    beforeEach('mock KoiosApi', async () => {
      await clearTables();
      resetKoiosApiCalls();
      resetMockedCardanoTrack();
      mockGetAddressBoxes(testBankAddress, bankBoxes);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    KoiosApi
     *    txAgreement
     * Scenario:
     *    Mock one Cardano tx and insert into db as 'approve' status
     *    Mock txAgreement getCardanoPendingTransactionsInputs
     *    Mock required assets
     *    Run test
     *    Check id of return boxes
     * Expected Output:
     *    It should track and filter boxes successfully
     */
    it('should filter db unsigned transactions lock boxes successfully', async () => {
      const cardanoTx2 = TestBoxes.mockPaymentTransactionWithInput(
        [TestBoxes.mockRandomBankBox(), bankBoxes[0]],
        [
          TestBoxes.mockRandomTransactionOutput(),
          TestBoxes.mockTransactionOutputFromUtxo(bankBoxes[0]),
        ]
      );
      await insertTxRecord(
        cardanoTx2,
        cardanoTx2.txType,
        cardanoTx2.network,
        TransactionStatus.approved,
        0,
        ''
      );

      // mock getCardanoPendingTransactionsInputs
      mockGetCardanoPendingTransactionsInputs([]);

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('46')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('10000000'),
        assets: multiAsset,
      };

      const expectedResult = [
        {
          txHash: bankBoxes[1].tx_hash,
          txIndex: bankBoxes[1].tx_index,
        },
        {
          txHash: bankBoxes[5].tx_hash,
          txIndex: bankBoxes[5].tx_index,
        },
      ];

      // run test
      const result = await CardanoTrack.trackAndFilterLockBoxes(requiredAssets);

      // verify box ids
      expect(
        result.map((box) => {
          return {
            txHash: box.tx_hash,
            txIndex: box.tx_index,
          };
        })
      ).to.have.deep.members(expectedResult);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    KoiosApi
     *    txAgreement
     * Scenario:
     *    Mock txAgreement getCardanoPendingTransactionsInputs
     *    Mock required assets
     *    Run test
     *    Check id of return boxes
     * Expected Output:
     *    It should track and filter boxes successfully
     */
    it('should filter txAgreement transactions lock boxes successfully', async () => {
      // mock getCardanoPendingTransactionsInputs
      mockGetCardanoPendingTransactionsInputs(
        bankBoxes.slice(2, 8).map((box) => {
          return {
            txHash: box.tx_hash,
            txIndex: box.tx_index,
          };
        })
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('90')
      );
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('10')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('5000000'),
        assets: multiAsset,
      };

      const expectedResult = [
        {
          txHash: bankBoxes[0].tx_hash,
          txIndex: bankBoxes[0].tx_index,
        },
        {
          txHash: bankBoxes[1].tx_hash,
          txIndex: bankBoxes[1].tx_index,
        },
        {
          txHash: bankBoxes[8].tx_hash,
          txIndex: bankBoxes[8].tx_index,
        },
      ];

      // run test
      const result = await CardanoTrack.trackAndFilterLockBoxes(requiredAssets);

      // verify box ids
      expect(
        result.map((box) => {
          return {
            txHash: box.tx_hash,
            txIndex: box.tx_index,
          };
        })
      ).to.have.deep.members(expectedResult);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    KoiosApi
     *    txAgreement
     * Scenario:
     *    Mock three txQueue tx (one of them contains lock boxes and one of them is Ergo tx)
     *    Mock txAgreement getCardanoPendingTransactionsInputs
     *    Mock required assets
     *    Run test
     *    Check id of return boxes
     * Expected Output:
     *    It should track and filter boxes successfully
     */
    it('should track txQueue lock boxes successfully', async () => {
      // mock Ergo tx
      const ergoTxMockData = ErgoTestBoxes.mockSignedTxWithLockErgoTree();
      await insertTxRecord(
        ergoTxMockData.tx,
        ergoTxMockData.tx.txType,
        ergoTxMockData.tx.network,
        TransactionStatus.signed,
        0,
        ergoTxMockData.tx.eventId
      );

      // mock tracking cardano tx
      const cardanoTx1 = TestBoxes.mockPaymentTransactionWithInput(
        [TestBoxes.mockRandomBankBox(), TestBoxes.mockRandomBankBox()],
        [
          TestBoxes.mockRandomTransactionOutput(),
          TestBoxes.mockRandomTransactionOutput(),
        ]
      );
      await insertTxRecord(
        cardanoTx1,
        cardanoTx1.txType,
        cardanoTx1.network,
        TransactionStatus.signed,
        0,
        ''
      );
      const cardanoTx2 = TestBoxes.mockPaymentTransactionWithInput(
        [TestBoxes.mockRandomBankBox(), bankBoxes[0]],
        [
          TestBoxes.mockRandomTransactionOutput(),
          TestBoxes.mockTransactionOutputFromUtxo(bankBoxes[0]),
        ]
      );
      await insertTxRecord(
        cardanoTx2,
        cardanoTx2.txType,
        cardanoTx2.network,
        TransactionStatus.signed,
        0,
        ''
      );

      // mock getCardanoPendingTransactionsInputs
      mockGetCardanoPendingTransactionsInputs([]);

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('90')
      );
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('10')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('5000000'),
        assets: multiAsset,
      };

      const expectedResult = [
        {
          txHash: cardanoTx2.txId,
          txIndex: 1,
        },
        {
          txHash: bankBoxes[1].tx_hash,
          txIndex: bankBoxes[1].tx_index,
        },
        {
          txHash: bankBoxes[6].tx_hash,
          txIndex: bankBoxes[6].tx_index,
        },
      ];

      // run test
      const result = await CardanoTrack.trackAndFilterLockBoxes(requiredAssets);

      // verify box ids
      expect(
        result.map((box) => {
          return {
            txHash: box.tx_hash,
            txIndex: box.tx_index,
          };
        })
      ).to.have.deep.members(expectedResult);
    });
  });

  describe('hasLockAddressEnoughAssets', () => {
    beforeEach('mock KoiosApi', async () => {
      resetKoiosApiCalls();
      resetMockedCardanoTrack();
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance
     *    Mock KoiosApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return false
     */
    it('should return false when there is NOT enough ada in address', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('1000000000')
      );
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('5000000000')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('500000000'),
        assets: multiAsset,
      };

      // run test
      const result = await CardanoTrack.hasLockAddressEnoughAssets(
        requiredAssets
      );

      // verify result
      expect(result).to.be.false;
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance
     *    Mock KoiosApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return false
     */
    it('should return false when there is NOT enough assets in address', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          'ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2'
        ),
        AssetName.new(Utils.hexStringToUint8Array('7369676d61')),
        BigNum.from_str('1000000000')
      );
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('665000000000')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('100000000'),
        assets: multiAsset,
      };

      // run test
      const result = await CardanoTrack.hasLockAddressEnoughAssets(
        requiredAssets
      );

      // verify result
      expect(result).to.be.false;
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    KoiosApi
     * Scenario:
     *    Mock KoiosApi getAddressInfo to return test lovelace balance
     *    Mock KoiosApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return true
     */
    it('should return true when there is enough ada and assets in address', async () => {
      // mock address info and assets
      mockKoiosGetAddressInfo(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumLovelaceAddressInfo
      );
      mockKoiosGetAddressAssets(
        CardanoConfigs.bankAddress,
        CardanoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const multiAsset = MultiAsset.new();
      multiAsset.set_asset(
        ScriptHash.from_hex(
          '22c3b86a5b88a78b5de52f4aed2831d1483b3b7681f1ee2569538130'
        ),
        AssetName.new(Utils.hexStringToUint8Array('1111111111')),
        BigNum.from_str('200000000')
      );
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('100000000'),
        assets: multiAsset,
      };

      // run test
      const result = await CardanoTrack.hasLockAddressEnoughAssets(
        requiredAssets
      );

      // verify result
      expect(result).to.be.true;
    });
  });

  describe('getCoveringUtxo', () => {
    // empty track map
    const emptyMap = new Map<InputUtxo, Utxo | undefined>();
    // mock getting bankBoxes
    const bankBoxes: Utxo[] = TestBoxes.mockBankBoxes();
    const requiredAssets: UtxoBoxesAssets = {
      lovelace: BigNum.from_str('111300000'),
      assets: MultiAsset.new(),
    };
    const paymentAssetInfo = CardanoUtils.getCardanoAssetInfo(
      'asset1nl000000000000000000000000000000000000'
    );
    const policyId = ScriptHash.from_bytes(
      Buffer.from(Utils.Uint8ArrayToHexString(paymentAssetInfo.policyId), 'hex')
    );
    const assetName = AssetName.new(
      Buffer.from(
        Utils.Uint8ArrayToHexString(paymentAssetInfo.assetName),
        'hex'
      )
    );

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    The function should return 1 specific box
     */
    it('should return 1 boxes for ADA payment', async () => {
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('100000000'),
        assets: MultiAsset.new(),
      };

      // run test
      const boxes = CardanoTrack.getCoveringUtxo(
        [bankBoxes[5], bankBoxes[4]],
        requiredAssets,
        emptyMap,
        []
      );

      // verify output boxes
      expect(boxes.length).greaterThanOrEqual(1);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    The function should return 2 specific box
     */
    it('should return 2 boxes for ADA payment', async () => {
      // mock ada payment event
      const requiredAssets: UtxoBoxesAssets = {
        lovelace: BigNum.from_str('111300000'),
        assets: MultiAsset.new(),
      };

      // run test
      const boxes = CardanoTrack.getCoveringUtxo(
        [bankBoxes[5], bankBoxes[1]],
        requiredAssets,
        emptyMap,
        []
      );

      // verify output boxes
      expect(boxes.length).to.equal(2);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    The function should return more than or equal 1 box
     */
    it('should return more than or equal 1 box', async () => {
      const assetList = Assets.new();
      assetList.insert(assetName, BigNum.from_str('50'));
      requiredAssets.assets.insert(policyId, assetList);

      // run test
      const boxes = CardanoTrack.getCoveringUtxo(
        bankBoxes,
        requiredAssets,
        emptyMap,
        []
      );

      // verify output boxes
      expect(boxes.length).to.greaterThanOrEqual(1);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    The function should return 3 box
     */
    it('should return 2 box for asset payment', async () => {
      const assetList = Assets.new();
      assetList.insert(assetName, BigNum.from_str('60'));
      requiredAssets.assets.insert(policyId, assetList);
      requiredAssets.lovelace = BigNum.zero();

      // run test
      const boxes = CardanoTrack.getCoveringUtxo(
        [bankBoxes[8], bankBoxes[6], bankBoxes[5]],
        requiredAssets,
        emptyMap,
        []
      );

      // verify output boxes
      expect(boxes.length).to.be.equal(2);
    });

    /**
     * Target: testing getCoveringUtxo
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    The function should return 2 box
     */
    it('should return 1 box for asset payment', async () => {
      const assetList = Assets.new();
      assetList.insert(assetName, BigNum.from_str('20'));
      requiredAssets.assets.insert(policyId, assetList);

      // run test
      const boxes = CardanoTrack.getCoveringUtxo(
        [bankBoxes[6], bankBoxes[5]],
        requiredAssets,
        emptyMap,
        []
      );

      // verify output boxes
      expect(boxes.length).to.be.equal(1);
    });
  });
});
