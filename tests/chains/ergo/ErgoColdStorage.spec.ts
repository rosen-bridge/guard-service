import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import { BoxesAssets } from '../../../src/chains/ergo/models/Interfaces';
import { beforeEach } from 'mocha';
import {
  mockExplorerGetAddressAssets,
  resetMockedExplorerApi,
} from './mocked/MockedExplorer';
import ErgoColdStorage from '../../../src/chains/ergo/ErgoColdStorage';
import {
  mockRewardTrackAndFilterLockBoxes,
  resetMockedReward,
} from '../mocked/MockedReward';

describe('ErgoColdStorage', () => {
  const testBankAddress = TestBoxes.testLockAddress;

  describe('generateTransaction', () => {
    beforeEach('reset mocks', function () {
      resetMockedExplorerApi();
      resetMockedReward(); // TODO: there is no need to reset reward after refactor (#109)
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock transferringAssets contains no token (erg only)
     *    Mock ExplorerApi getCoveringErgAndTokenForErgoTree to return test bank boxes (only erg greater than high threshold)
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Run test
     *    Run ErgoColdStorage verifyTransaction method. It should return true
     * Expected Output:
     *    Tx generated and verified successfully
     */
    it('should generate a valid transaction when erg is more than its high threshold', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock transferringAssets
      const transferringAssets: BoxesAssets = {
        ergs: 677000000000n,
        tokens: {},
      };
      // mock bank boxes
      mockRewardTrackAndFilterLockBoxes(mockedBankAssetsAndBoxes[1]);
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // run test
      const tx = await ErgoColdStorage.generateTransaction(transferringAssets);

      // verify
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.true;
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock transferringAssets contains one token
     *    Mock ExplorerApi getCoveringErgAndTokenForErgoTree to return test bank boxes (erg and one token are greater than high threshold)
     *    Mock ExplorerApi getAddressAssets to return test assets (erg and one token are greater than high threshold)
     *    Run test
     *    Run ErgoColdStorage verifyTransaction method. It should return true
     * Expected Output:
     *    Tx generated and verified successfully
     */
    it('should generate a valid transaction when erg and at least one token are more than their high threshold', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighTokenBankAssetsAndBoxes();
      // mock transferringAssets
      const transferringAssets: BoxesAssets = {
        ergs: 677000000000n,
        tokens: {
          '064c58ea394d41fada074a3c560a132467adf4ca1512c409c014c625ca285e9c':
            390000000n,
        },
      };
      // mock bank boxes and assets
      mockRewardTrackAndFilterLockBoxes(mockedBankAssetsAndBoxes[1]);
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // run test
      const tx = await ErgoColdStorage.generateTransaction(transferringAssets);

      // verify
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.true;
    });
  });

  describe('verifyTransaction', () => {
    beforeEach('reset mocks', function () {
      resetMockedExplorerApi();
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a valid cold storage transaction
     *    Run test
     *    Check return value to be true
     * Expected Output:
     *    It should verify the transaction
     */
    it('should agree to a fine cold storage tx', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockFineColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.true;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction containing additional output boxes
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with additional outputs', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mock4outBoxesColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction containing invalid coldBox (wrong ergoTree)
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with wrong coldBox ergoTree', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockInvalidColdAddressColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction containing invalid changeBox (wrong ergoTree)
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with wrong changeBox ergoTree', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockInvalidChangeBoxAddressColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction containing invalid changeBox (contain register)
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx where the changeBox contains register', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockColdStorageTransactionWithRegisters(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction containing invalid tx fee
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx with additional tx fee', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockColdStorageTransactionWithAdditionalFee(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction that transfers more than allowed amount of erg
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx that transfers more than allowed amount of erg', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockLowErgColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction that transfers more than allowed amount of a token
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx that transfers more than allowed amount of a token', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockLowTokenColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });

    /**
     * Target: testing verifyTransaction
     * Dependencies:
     *    ExplorerApi
     * Scenario:
     *    Mock ExplorerApi getAddressAssets to return test assets (only erg greater than high threshold)
     *    Mock a cold storage transaction that does NOT transfer enough ergs
     *    Run test
     *    Check return value to be false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject the tx that does NOT transfer enough ergs', async () => {
      const mockedBankAssetsAndBoxes =
        TestBoxes.mockHighErgAssetsAndBankBoxes();
      // mock bank boxes and assets
      mockExplorerGetAddressAssets(
        testBankAddress,
        mockedBankAssetsAndBoxes[0]
      );

      // mock test tx
      const tx = TestBoxes.mockHighErgColdStorageTransaction(
        mockedBankAssetsAndBoxes[1].boxes
      );

      // run test
      const res = await ErgoColdStorage.verifyTransaction(tx);
      expect(res).to.be.false;
    });
  });
});
