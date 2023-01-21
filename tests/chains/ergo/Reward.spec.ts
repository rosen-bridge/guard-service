import {
  EventStatus,
  EventTrigger,
  TransactionStatus,
  TransactionTypes,
} from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import Reward from '../../../src/chains/ergo/Reward';
import { expect } from 'chai';
import { CoveringErgoBoxes } from '../../../src/chains/ergo/models/Interfaces';
import { beforeEach } from 'mocha';
import { resetMockedExplorerApi } from './mocked/MockedExplorer';
import {
  mockGetEventBox,
  mockGetEventPaymentTransactionId,
  mockGetEventValidCommitments,
  resetMockedInputBoxes,
} from './mocked/MockedInputBoxes';
import { anything, spy, when } from 'ts-mockito';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import { resetMockedReward } from '../mocked/MockedReward';
import { Fee } from '@rosen-bridge/minimum-fee';
import {
  mockErgoHasLockAddressEnoughAssets,
  mockTrackAndFilterLockBoxes,
} from '../mocked/MockedErgoTrack';
import { NotEnoughAssetsError } from '../../../src/helpers/errors';
import {
  clearTables,
  insertEventRecord,
  insertTxRecord,
} from '../../db/mocked/MockedScannerModel';

describe('Reward', () => {
  describe('generateTransaction', () => {
    // mock getting boxes
    const bankBoxes: CoveringErgoBoxes = TestBoxes.mockBankBoxes();
    const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments();
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('mock ExplorerApi', async function () {
      await clearTables();
      resetMockedReward();
      resetMockedExplorerApi();
      mockErgoHasLockAddressEnoughAssets(true);
      mockTrackAndFilterLockBoxes(bankBoxes);
      resetMockedInputBoxes();
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1));
    });

    /**
     * Target: testing generateTransaction
     * Dependencies:
     *    ExplorerApi
     *    RewardBoxes
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an erg distribution tx and verify it successfully', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      const emptyTx = TestBoxes.mockEmptyPaymentTransactionObject(
        TransactionTypes.payment,
        mockedEvent.getId()
      );
      await insertTxRecord(
        emptyTx,
        emptyTx.txType,
        emptyTx.network,
        TransactionStatus.completed,
        100,
        mockedEvent.getId()
      );

      // run test
      const tx = await Reward.generateTransaction(mockedEvent, mockedFeeConfig);

      // verify tx
      const isValid = await Reward.verifyTransactionWithEvent(
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
     *    RewardBoxes
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate a token distribution tx and verify it successfully', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      const emptyTx = TestBoxes.mockEmptyPaymentTransactionObject(
        TransactionTypes.payment,
        mockedEvent.getId()
      );
      await insertTxRecord(
        emptyTx,
        emptyTx.txType,
        emptyTx.network,
        TransactionStatus.completed,
        100,
        mockedEvent.getId()
      );

      // run test
      const tx = await Reward.generateTransaction(mockedEvent, mockedFeeConfig);

      // verify tx
      const isValid = await Reward.verifyTransactionWithEvent(
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
     *    RewardBoxes
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an erg distribution tx with RSN token and verify it successfully', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      const emptyTx = TestBoxes.mockEmptyPaymentTransactionObject(
        TransactionTypes.payment,
        mockedEvent.getId()
      );
      await insertTxRecord(
        emptyTx,
        emptyTx.txType,
        emptyTx.network,
        TransactionStatus.completed,
        100,
        mockedEvent.getId()
      );

      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);

      // run test
      const tx = await Reward.generateTransaction(mockedEvent, mockedFeeConfig);

      // verify tx
      const isValid = await Reward.verifyTransactionWithEvent(
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
     *    RewardBoxes
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate a token distribution tx with RSN token and verify it successfully', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      const emptyTx = TestBoxes.mockEmptyPaymentTransactionObject(
        TransactionTypes.payment,
        mockedEvent.getId()
      );
      await insertTxRecord(
        emptyTx,
        emptyTx.txType,
        emptyTx.network,
        TransactionStatus.completed,
        100,
        mockedEvent.getId()
      );

      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);

      // run test
      const tx = await Reward.generateTransaction(mockedEvent, mockedFeeConfig);

      // verify tx
      const isValid = await Reward.verifyTransactionWithEvent(
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
     *    RewardBoxes
     * Expected Output:
     *    The function should construct a valid tx successfully
     *    It should also verify it successfully
     */
    it('should generate an only RSN distribution tx and verify it successfully', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      const emptyTx = TestBoxes.mockEmptyPaymentTransactionObject(
        TransactionTypes.payment,
        mockedEvent.getId()
      );
      await insertTxRecord(
        emptyTx,
        emptyTx.txType,
        emptyTx.network,
        TransactionStatus.completed,
        100,
        mockedEvent.getId()
      );

      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);
      when(spiedErgoConfig.watchersSharePercent).thenReturn(0n);

      // run test
      const tx = await Reward.generateTransaction(mockedEvent, mockedFeeConfig);

      // verify tx
      const isValid = await Reward.verifyTransactionWithEvent(
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
     * Expected Output:
     *    The function should throw error
     */
    it('should throw NotEnoughAssetsError when there is not enough assets to generate transaction', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      await insertEventRecord(mockedEvent, EventStatus.pendingReward);
      const emptyTx = TestBoxes.mockEmptyPaymentTransactionObject(
        TransactionTypes.payment,
        mockedEvent.getId()
      );
      await insertTxRecord(
        emptyTx,
        emptyTx.txType,
        emptyTx.network,
        TransactionStatus.completed,
        100,
        mockedEvent.getId()
      );

      mockErgoHasLockAddressEnoughAssets(false);

      // run test
      await expect(
        Reward.generateTransaction(mockedEvent, mockedFeeConfig)
      ).to.be.rejectedWith(NotEnoughAssetsError);
    });
  });

  describe('verifyTransactionWithEvent', () => {
    // mock getting boxes
    const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments();
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };
    const paymentTxId =
      '001b0f0ca1b87bf9444ff29c39efdf12b0061c67f42826e55f6d34f2479be7aa';

    beforeEach('mock ExplorerApi', function () {
      resetMockedReward();
      resetMockedInputBoxes();
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1));
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an erg reward distribution tx that transferring token', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      const tx = TestBoxes.mockTokenTransferringErgDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a reward distribution tx that transferring to wrong WID', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      const tx = TestBoxes.mockTransferToIllegalWIDDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a reward distribution tx that missing a valid commitment box when distributing rewards', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      const tx = TestBoxes.mockMissingValidCommitmentDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments.slice(0, eventBoxAndCommitments.length - 1)
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a reward distribution tx that change box address is not bank address', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      const tx = TestBoxes.mockIllegalChangeBoxDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a reward distribution tx that transferring wrong token', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      const tx = TestBoxes.mockWrongTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a reward distribution tx that transferring wrong amount of target token', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      const tx = TestBoxes.mockWrongAmountTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a token reward distribution tx that that burning some token', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      mockGetEventPaymentTransactionId(mockedEvent.getId(), paymentTxId);
      const tx = TestBoxes.mockTokenBurningTokenDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a erg reward distribution tx that that burning some token', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      mockGetEventPaymentTransactionId(mockedEvent.getId(), paymentTxId);
      const tx = TestBoxes.mockTokenBurningErgDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an only RSN distribution tx that transferring wrong amount', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgRewardEventTrigger();
      mockGetEventPaymentTransactionId(mockedEvent.getId(), paymentTxId);
      const tx = TestBoxes.mockWrongAmountRSNOnlyDistributionTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );
      const spiedErgoConfig = spy(ErgoConfigs);
      when(spiedErgoConfig.watchersRSNSharePercent).thenReturn(40n);
      when(spiedErgoConfig.watchersSharePercent).thenReturn(0n);

      // run test
      const isValid = await Reward.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });
  });
});
