import ErgoChain from '../../../src/chains/ergo/ErgoChain';
import { EventTrigger } from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import { CoveringErgoBoxes } from '../../../src/chains/ergo/models/Interfaces';
import {
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
});
