import ErgoChain from '../../../src/chains/ergo/ErgoChain';
import { EventTrigger, TransactionStatus } from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import { CoveringErgoBoxes } from '../../../src/chains/ergo/models/Interfaces';
import {
  mockExplorerGetMempoolTxsForAddress,
  mockGetBoxesForErgoTree,
  resetMockedExplorerApi,
} from './mocked/MockedExplorer';
import { beforeEach } from 'mocha';
import ErgoUtils from '../../../src/chains/ergo/helpers/ErgoUtils';
import {
  mockGetEventBox,
  mockGetEventValidCommitments,
  resetMockedInputBoxes,
} from './mocked/MockedInputBoxes';
import { anything, spy, when } from 'ts-mockito';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import { Fee } from '@rosen-bridge/minimum-fee';
import ErgoTxVerifier from '../../../src/chains/ergo/ErgoTxVerifier';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import { JsonBI } from '../../../src/network/NetworkModels';
import {
  clearTables,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';
import { mockGetErgoPendingTransactionsInputs } from '../../guard/mocked/MockedTxAgreement';
import CardanoTestBoxes from '../cardano/testUtils/TestBoxes';
import sinon from 'sinon';

describe('ErgoChain', () => {
  const testBankAddress = TestBoxes.testLockAddress;
  const testBankErgoTree: string =
    ErgoUtils.addressStringToErgoTreeString(testBankAddress);

  describe('generateTransaction', () => {
    // mock getting bankBoxes
    const bankBoxes: CoveringErgoBoxes = TestBoxes.mockBankBoxes();
    const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments();
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    // mock trackAndFilterLockBoxes method of ergoChain
    let ergoChain: ErgoChain = new ErgoChain();

    beforeEach('mock ExplorerApi', function () {
      resetMockedExplorerApi();
      resetMockedInputBoxes();
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1));
      ergoChain = new ErgoChain();
      sinon.stub(ergoChain, 'trackAndFilterLockBoxes').resolves(bankBoxes);
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an Erg payment tx and verify it successfully', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger();

      // run test
      const tx = await ergoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate a token payment tx and verify it successfully', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();

      // run test

      const tx = await ergoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an Erg payment tx with RSN and verify it successfully', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger();
      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);

      // run test

      const tx = await ergoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate a token payment tx with RSN and verify it successfully', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);

      // run test

      const tx = await ergoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     *    NodeApi
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an only RSN payment tx and verify it successfully', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger();
      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);
      when(spiedErgoConfig.watchersSharePercent).thenReturn(0n);

      // run test

      const tx = await ergoChain.generateTransaction(
        mockedEvent,
        mockedFeeConfig
      );

      // verify tx
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });
  });

  describe('trackAndFilterLockBoxes', () => {
    const bankBoxes = TestBoxes.mockManyBankBoxes();

    beforeEach('mock ExplorerApi', async () => {
      await clearTables();
      resetMockedExplorerApi();
      mockGetBoxesForErgoTree(testBankErgoTree, bankBoxes);
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
     *    Mock txAgreement getErgoPendingTransactionsInputs
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

      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs(
        bankBoxes.items.slice(8, 10).map((box) => box.boxId)
      );

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const result = await ergoChain.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {
          ['068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906']:
            BigInt('123456789123456789'),
        },
      });

      // verify box ids
      expect(result.boxes.map((box) => box.box_id().to_str())).to.deep.equal([
        targetBox.box_id().to_str(),
        ...bankBoxes.items.slice(1, 3).map((box) => box.boxId),
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
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
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
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
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
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {
          '068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906':
            BigInt('123456789123456789'),
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
    it('should return all boxes with covered flag', async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
        ergs: BigInt('100000000000'),
        tokens: {
          '907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e':
            BigInt('100'),
        },
      });
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(14);
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
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
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
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
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
    it("should return all boxes with not-covered flag when can't cover tokens", async () => {
      // mock getMempoolTxsForAddress
      mockExplorerGetMempoolTxsForAddress(testBankAddress, {
        items: [],
        total: 0,
      });
      // mock getErgoPendingTransactionsInputs
      mockGetErgoPendingTransactionsInputs([]);

      // run test
      const ergoChain: ErgoChain = new ErgoChain();
      const boxes = await ergoChain.trackAndFilterLockBoxes({
        ergs: BigInt('1000000000'),
        tokens: {
          '907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e':
            BigInt('500'),
        },
      });
      expect(boxes.covered).to.be.false;
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

      // mock ergoChain lockErgoTree
      const ergoChain: ErgoChain = new ErgoChain();
      sinon.stub(ergoChain, 'lockErgoTree').get(() => ergoTxMockData.ergoTree);

      // run test
      const trackMap = new Map<string, ErgoBox | undefined>();
      await ergoChain.generateTxQueueTrackMap(trackMap);

      // verify map
      const mapKeys = Array.from(trackMap.keys());
      expect(mapKeys.length === expectedTrackingBoxIds.length);
      expectedTrackingBoxIds.forEach((inputId) => {
        expect(mapKeys.find((key) => key === inputId)).to.exist;
        expect(trackMap.get(inputId)!.box_id().to_str()).to.equal(
          expectedTrackedBoxId
        );
      });
    });
  });
});
