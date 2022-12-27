import ErgoChain from '../../../src/chains/ergo/ErgoChain';
import { EventTrigger, TransactionStatus } from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import { CoveringErgoBoxes } from '../../../src/chains/ergo/models/Interfaces';
import {
  mockExplorerGetMempoolTxsForAddress,
  mockGetBoxesForErgoTree,
  mockGetCoveringErgAndTokenForErgoTree,
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
import TestUtils from '../../testUtils/TestUtils';
import { ErgoBox, Transaction } from 'ergo-lib-wasm-nodejs';
import { JsonBI } from '../../../src/network/NetworkModels';
import CardanoTestBoxes from '../../chains/cardano/testUtils/TestBoxes';
import { insertTxRecord } from '../../db/mocked/MockedScannerModel';
import { mockGetErgoPendingTransactionsInputs } from '../../guard/mocked/MockedTxAgreement';

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

    beforeEach('mock ExplorerApi', function () {
      resetMockedExplorerApi();
      mockGetCoveringErgAndTokenForErgoTree(testBankErgoTree, bankBoxes);
      resetMockedInputBoxes();
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1));
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
      const ergoChain: ErgoChain = new ErgoChain();
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
      const ergoChain: ErgoChain = new ErgoChain();
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
      const ergoChain: ErgoChain = new ErgoChain();
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
      const ergoChain: ErgoChain = new ErgoChain();
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
      const ergoChain: ErgoChain = new ErgoChain();
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

  describe('tractAndFilterLockBoxes', () => {
    const bankBoxes = TestBoxes.mockManyBankBoxes();

    beforeEach('mock ExplorerApi', function () {
      resetMockedExplorerApi();
    });

    /**
     * Target: testing tractAndFilterLockBoxes
     * Dependencies:
     *    ExplorerApi
     *    txAgreement
     * Scenario:
     *    Mock ExplorerApi getBoxesForErgoTree for to return last step boxes
     *    Mock two mempool tx (one of them contains lock boxes)
     *    Mock ExplorerApi getMempoolTxsForAddress to return two mocked txs
     *    Mock one Ergo tx and insert into db as 'approve' status
     *    Mock txAgreement getErgoPendingTransactionsInputs
     *    Run test
     *    Check id of return boxes. It should have tracked and filtered successfully.
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should track and filter lock boxes successfully', async () => {
      // mock getBoxesForErgoTree
      mockGetBoxesForErgoTree(testBankErgoTree, bankBoxes);

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
        ergs: 10n,
        tokens: {
          '': 10n,
        },
      });

      // verify tx
      expect(result.boxes.map((box) => box.box_id().to_str())).to.deep.equal([
        targetBox.box_id().to_str(),
        ...bankBoxes.items.slice(1, 8).map((box) => box.boxId),
      ]);
    });
  });
});
