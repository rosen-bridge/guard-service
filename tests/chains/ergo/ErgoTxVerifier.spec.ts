import { EventTrigger } from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import { expect } from 'chai';
import {
  mockExplorerGetConfirmedTx,
  resetMockedExplorerApi,
} from './mocked/MockedExplorer';
import { beforeEach } from 'mocha';
import TestData from './testUtils/TestData';
import {
  mockGetEventBox,
  mockGetEventValidCommitments,
  resetMockedInputBoxes,
} from './mocked/MockedInputBoxes';
import { anything } from 'ts-mockito';
import ErgoConfigs from '../../../src/chains/ergo/helpers/ErgoConfigs';
import sinon from 'sinon';
import { Fee } from '@rosen-bridge/minimum-fee';
import { mockGetFee } from '../../guard/mocked/MockedMinimumFee';
import ErgoTxVerifier from '../../../src/chains/ergo/ErgoTxVerifier';

describe('ErgoTxVerifier', () => {
  describe('verifyTransactionWithEvent', () => {
    // mock getting boxes
    const eventBoxAndCommitments = TestBoxes.mockEventBoxWithSomeCommitments();
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('mock ExplorerApi', function () {
      resetMockedInputBoxes();
      mockGetEventBox(anything(), eventBoxAndCommitments[0]);
      mockGetEventValidCommitments(anything(), eventBoxAndCommitments.slice(1));
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an Erg payment tx that transferring token', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger();
      const tx = TestBoxes.mockTokenTransferringPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a token payment tx with no token transferring', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockErgTransferringPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a token payment tx that transferring multiple tokens', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockMultipleTokensTransferringPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a token payment tx that transferring wrong token', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockWrongTokenTransferringPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
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
    it('should reject a token payment tx that distributing reward to wrong WID', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockTransferToIllegalWIDTokenPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
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
    it('should reject a token payment tx that missing a valid commitment box when distributing rewards', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger = TestBoxes.mockTokenRewardEventTrigger();
      const tx = TestBoxes.mockMissingValidCommitmentTokenPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments.slice(0, eventBoxAndCommitments.length - 1)
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a token payment tx that burning some token', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockTokenBurningTokenPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a erg payment tx that burning some token', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger();
      const tx = TestBoxes.mockTokenBurningErgPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an only RSN payment tx that transferring wrong amount', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger = TestBoxes.mockErgPaymentEventTrigger();
      const tx = TestBoxes.mockWrongAmountRSNOnlyPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );
      const feeConfig = {
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 47n,
      };
      sinon.stub(ErgoConfigs, 'watchersRSNSharePercent').value(40n);
      sinon.stub(ErgoConfigs, 'watchersSharePercent').value(0n);

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        feeConfig
      );
      expect(isValid).to.be.false;
      sinon.restore();
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    RewardBoxes
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject a payment tx with wrong R4 in bridgeFee box', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockWrongR4PaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
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
     *    It should verify the transaction
     */
    it('should accept a valid payment tx', async () => {
      // mock erg payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockTokenPaymentEventTrigger();
      const tx = TestBoxes.mockFineTokenPaymentTransaction(
        mockedEvent,
        eventBoxAndCommitments
      );

      // run test
      const isValid = await ErgoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });
  });

  describe('verifyEventWithPayment', () => {
    const observationTx = JSON.parse(TestData.mockedObservationTx);
    const nonObservationTx = JSON.parse(TestData.mockedNonObservationTx);
    const ergObservationTx = JSON.parse(TestData.mockedErgObservationTx);
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('mock ExplorerApi', function () {
      resetMockedExplorerApi();
      mockExplorerGetConfirmedTx(observationTx.id, observationTx);
      mockExplorerGetConfirmedTx(nonObservationTx.id, nonObservationTx);
      mockExplorerGetConfirmedTx(ergObservationTx.id, ergObservationTx);
      mockGetFee(mockedFeeConfig);
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event amount is less than the event fees', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockSmallAmountEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should verify the event
     */
    it('should return true when the event locking erg is correct', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidErgEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with toChain', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidToChainEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with toAddress', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidToAddressEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with amount', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidAmountEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with bridgeFee', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidBridgeFeeEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with networkFee', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidNetworkFeeEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with sourceTokenId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidSourceTokenEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with targetTokenId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidTargetTokenEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with blockId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidBlockEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event is incorrect with sourceTxId', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockInvalidTxEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    ErgoUtils
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event can not recovered from tx', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockSmallAmountEventTrigger();
      sinon.stub(ErgoTxVerifier.rosenExtractor, 'get').returns(undefined);

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        ErgoConfigs.ergoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
      sinon.restore();
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Scenario:
     *    Mock a valid eventTrigger
     *    Pass the valid trigger event with an invalid RWTId
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when RWT token is not compatible with the event source chain', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockSmallAmountEventTrigger();

      // run test
      const isValid = await ErgoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        'fake RWTId'
      );
      expect(isValid).to.be.false;
    });
  });
});
