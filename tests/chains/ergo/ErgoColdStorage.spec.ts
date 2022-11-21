import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import {
  BoxesAssets,
  CoveringErgoBoxes,
} from '../../../src/chains/ergo/models/Interfaces';
import { beforeEach, Test } from 'mocha';
import ErgoUtils from '../../../src/chains/ergo/helpers/ErgoUtils';
import {
  mockExplorerGetAddressAssets,
  mockGetCoveringErgAndTokenForErgoTree,
  resetMockedExplorerApi,
} from './mocked/MockedExplorer';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import ErgoTestBoxes from './testUtils/TestBoxes';
import ColdStorage from '../../../src/guard/coldStorage/ColdStorage';
import { verifyErgoColdStorageGenerateTxDidntGetCalled } from '../mocked/MockedErgoColdStorage';
import { verifyStartAgreementProcessDidntGetCalled } from '../../guard/mocked/MockedTxAgreement';
import ErgoColdStorage from '../../../src/chains/ergo/ErgoColdStorage';

describe('ErgoColdStorage', () => {
  const testBankAddress = TestBoxes.testLockAddress;
  const testBankErgoTree: string =
    ErgoUtils.addressStringToErgoTreeString(testBankAddress);

  describe('generateTransaction', () => {
    beforeEach('reset mocks', function () {
      resetMockedExplorerApi();
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
      mockGetCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        mockedBankAssetsAndBoxes[1]
      );
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
      mockGetCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        mockedBankAssetsAndBoxes[1]
      );
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
});
