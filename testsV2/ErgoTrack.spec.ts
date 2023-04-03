import TestBoxes from '../tests/chains/ergo/testUtils/TestBoxes';
import ErgoUtils from '../src/chains/ergo/helpers/ErgoUtils';
import {
  clearTables,
  insertTxRecord,
} from '../tests/db/mocked/MockedScannerModel';
import {
  mockExplorerGetMempoolTxsForAddress,
  mockGetBoxesForErgoTree,
  resetMockedExplorerApi,
} from '../tests/chains/ergo/mocked/MockedExplorer';
import { resetMockedErgoTrack } from '../tests/chains/mocked/MockedErgoTrack';
import { ErgoBox } from 'ergo-lib-wasm-nodejs';
import { JsonBI } from '../src/network/NetworkModels';
import { TransactionStatus } from '../src/models/Models';
import ErgoTestBoxes from '../tests/chains/ergo/testUtils/TestBoxes';
import { mockGetChainPendingTransactions } from '../tests/guard/mocked/MockedTxAgreement';
import ErgoTrack from '../src/chains/ergo/ErgoTrack';

describe('ErgoTrack', () => {
  const testBankAddress = TestBoxes.testLockAddress;
  const testBankErgoTree: string =
    ErgoUtils.addressStringToErgoTreeString(testBankAddress);

  describe('trackAndFilterLockBoxes', () => {
    const bankBoxes = TestBoxes.mockManyBankBoxes();

    beforeEach(async () => {
      await clearTables();
      resetMockedExplorerApi();
      resetMockedErgoTrack();
      mockGetBoxesForErgoTree(testBankErgoTree, bankBoxes);
      console.log(`beforeEach Done!`);
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
  });
});
