import { TransactionStatus } from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import {
  mockExplorerGetAddressAssets,
  mockExplorerGetMempoolTxsForAddress,
  mockGetBoxesByAddress,
  resetMockedExplorerApi,
} from './mocked/MockedExplorer';
import { beforeEach } from 'mocha';
import ErgoUtils from '../../../src/chains/ergo/helpers/ErgoUtils';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import { JsonBI } from '../../../src/network/NetworkModels';
import {
  clearTables,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';
import { mockGetChainPendingTransactions } from '../../guard/mocked/MockedTxAgreement';
import CardanoTestBoxes from '../cardano/testUtils/TestBoxes';
import ErgoTrack from '../../../src/chains/ergo/ErgoTrack';
import { resetMockedErgoTrack } from '../mocked/MockedErgoTrack';
import sinon from 'sinon';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import ErgoTestBoxes from './testUtils/TestBoxes';
import { BoxesAssets } from '../../../src/chains/ergo/models/Interfaces';

describe('ErgoTrack', () => {
  const testBankAddress = TestBoxes.testLockAddress;
  const testBankErgoTree: string =
    ErgoUtils.addressStringToErgoTreeString(testBankAddress);

  describe('trackAndFilterLockBoxes', () => {
    const bankBoxes = TestBoxes.mockManyBankBoxes();

    beforeEach('mock ExplorerApi', async () => {
      await clearTables();
      resetMockedExplorerApi();
      resetMockedErgoTrack();
      mockGetBoxesByAddress(TestBoxes.testLockAddress, bankBoxes);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     *    txAgreement
     * Scenario:
     *    Mock two mempool tx (one of them contains lock boxes)
     *    Mock ExplorerApi getMempoolTxsForAddress to return two mocked txs
     *    Mock one Ergo tx and insert into db as 'approve' status
     *    Mock txAgreement getChainPendingTransactions
     *    Run test
     *    Check id of return boxes. It should have tracked and filtered successfully.
     * Expected Output:
     *    It should track and filter boxes successfully
     */
    it('should track and filter lock boxes successfully', async () => {
      // mock two mempool tx
      const trackingInputBox = bankBoxes.items[0];
      const targetBox = TestBoxes.mockSingleBox(
        trackingInputBox.value.toString(),
        trackingInputBox.assets,
        ErgoUtils.addressStringToContract(testBankAddress)
      );
      const mempoolTxs = TestBoxes.mockTwoMempoolTx(
        trackingInputBox,
        targetBox
      );

      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, mempoolTxs);

      // mock one Ergo tx and insert into db
      const ergoUnsignedTx = TestBoxes.mockFineColdStorageTransaction(
        bankBoxes.items
          .slice(10)
          .map((box) => ErgoBox.from_json(JsonBI.stringify(box)))
      );
      await insertTxRecord(
        ergoUnsignedTx,
        ergoUnsignedTx.txType,
        ergoUnsignedTx.network,
        TransactionStatus.approved,
        0,
        ergoUnsignedTx.eventId
      );

      // mock getChainPendingTransactions
      const pendingTx = ErgoTestBoxes.mockFineColdStorageTransaction(
        bankBoxes.items
          .slice(8, 10)
          .map((box) => ErgoBox.from_json(JsonBI.stringify(box)))
      );
      mockGetChainPendingTransactions([pendingTx]);

      // run test
      const result = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {
          ['068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906']:
            BigInt('123456789123456789'),
        },
      });

      // verify box ids
      expect(result.boxes.map((box) => box.box_id().to_str())).to.deep.equal([
        targetBox.box_id().to_str(),
        bankBoxes.items[2].boxId,
      ]);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return empty list with covered flag', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('0'),
        tokens: {},
      });
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(0);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes that cover requested erg amount', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {},
      });
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(1);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes that cover requested erg and token amount', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {
          '068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906':
            BigInt('123456789123456789'),
        },
      });

      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(2);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes that cover requested erg and token amount', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('100000000000'),
        tokens: {
          '907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e':
            BigInt('100'),
        },
      });
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(3);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes which is more than 10 boxes that cover requested erg amount', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('230000000000'),
        tokens: {},
      });
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(12);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return all boxes with not-covered flag', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('555666771000000000'),
        tokens: {},
      });
      expect(boxes.covered).to.be.false;
      expect(boxes.boxes.length).to.equal(14);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it("should return all containing boxes when can't cover tokens", async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {
          '907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e':
            BigInt('500'),
        },
      });

      expect(boxes.covered).to.be.false;
      expect(boxes.boxes.length).to.equal(3);
    });

    /**
     * Target: testing trackAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return all boxes
     */
    it('should return all boxes to cover erg amount', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getChainPendingTransactions
      mockGetChainPendingTransactions([]);

      // run test
      const boxes = await ErgoTrack.trackAndFilterLockBoxes({
        ergs: BigInt('241000000000'),
        tokens: {},
      });

      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(14);
    });
  });

  describe('generateTxQueueTrackMap', () => {
    beforeEach('clear db tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing generateTxQueueTrackMap
     * Dependencies:
     *    -
     * Scenario:
     *    Mock one Ergo tx and insert into db as 'signed' status
     *    Mock one Cardano tx and insert into db as 'signed' status
     *    Mock ergoChain lockErgoTree
     *    Run test
     *    Check records of track map. It should contain tracking of Ergo tx.
     * Expected Output:
     *    It should add valid tracking boxes to map successfully
     */
    it('should add tracking of tx queue lock boxes to input track map', async () => {
      // mock Ergo tx
      const ergoTxMockData = TestBoxes.mockSignedTxWithLockErgoTree();
      await insertTxRecord(
        ergoTxMockData.tx,
        ergoTxMockData.tx.txType,
        ergoTxMockData.tx.network,
        TransactionStatus.signed,
        0,
        ergoTxMockData.tx.eventId
      );
      const expectedTrackingBoxIds = [
        '8800e3a9e614bfffa3d031e519d5348b14a023c0af0f9a3ab18241eef86cc770',
        '579c468a4e36d41e7c5023ebc4963fd344ac269beb33f63f39d19fe2b14a55cf',
      ];
      const expectedTrackedBoxId =
        '5e67d11de9199f588a40b44d9d60732dd89eae94651f26e308387bd6f621dbe7';

      // mock Cardano tx
      const cardanoTx = CardanoTestBoxes.mockFineColdStorageTx();
      await insertTxRecord(
        cardanoTx,
        cardanoTx.txType,
        cardanoTx.network,
        TransactionStatus.signed,
        0,
        cardanoTx.eventId
      );

      // mock ErgoTrack lockErgoTree
      sinon.stub(ErgoTrack, 'lockErgoTree').get(() => ergoTxMockData.ergoTree);

      // run test
      const trackMap = new Map<string, ErgoBox | undefined>();
      await ErgoTrack.generateTxQueueTrackMap(trackMap);

      // verify map
      const mapKeys = Array.from(trackMap.keys());
      expect(mapKeys.length === expectedTrackingBoxIds.length);
      expectedTrackingBoxIds.forEach((inputId) => {
        expect(mapKeys.find((key) => key === inputId)).to.exist;
        expect(trackMap.get(inputId)!.box_id().to_str()).to.equal(
          expectedTrackedBoxId
        );
      });

      // release ErgoTrack lockErgoTree mock
      sinon.restore();
    });
  });

  describe('hasLockAddressEnoughAssets', () => {
    beforeEach('mock ExplorerApi', async () => {
      resetMockedExplorerApi();
      resetMockedErgoTrack();
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return false
     */
    it('should return false when there is NOT enough erg in address', async () => {
      // mock address assets
      mockExplorerGetAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress,
        ErgoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const requiredAssets: BoxesAssets = {
        ergs: 923000000000n,
        tokens: {
          '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95':
            1000000000n,
          '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c':
            10000000n,
        },
      };

      // run test
      const result = await ErgoTrack.hasLockAddressEnoughAssets(requiredAssets);

      // verify result
      expect(result).to.be.false;
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return false
     */
    it('should return false when there is NOT enough tokens in address', async () => {
      // mock address assets
      mockExplorerGetAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress,
        ErgoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const requiredAssets: BoxesAssets = {
        ergs: 23000000000n,
        tokens: {
          '0034c44f0c7a38f833190d44125ff9b3a0dd9dbb89138160182a930bc521db95':
            1000000000n,
          '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c':
            5510000000n,
        },
      };

      // run test
      const result = await ErgoTrack.hasLockAddressEnoughAssets(requiredAssets);

      // verify result
      expect(result).to.be.false;
    });

    /**
     * Target: testing hasLockAddressEnoughAssets
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets
     *    Mock required assets
     *    Run test
     *    Check return value.
     * Expected Output:
     *    It should return true
     */
    it('should return true when there is enough assets in address', async () => {
      // mock address assets
      mockExplorerGetAddressAssets(
        ErgoConfigs.ergoContractConfig.lockAddress,
        ErgoTestBoxes.mediumAddressAssets
      );

      // mock required assets
      const requiredAssets: BoxesAssets = {
        ergs: 23000000000n,
        tokens: {
          '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c':
            10000000n,
        },
      };

      // run test
      const result = await ErgoTrack.hasLockAddressEnoughAssets(requiredAssets);

      // verify result
      expect(result).to.be.true;
    });
  });
});
