import { mockKoiosGetTxInfo } from './mocked/MockedKoios';
import CardanoChain from '../../../src/chains/cardano/CardanoChain';
import { EventTrigger } from '../../../src/models/Models';
import TestBoxes from './testUtils/TestBoxes';
import TestData from './testUtils/TestData';
import { expect } from 'chai';
import { beforeEach } from 'mocha';
import sinon from 'sinon';
import CardanoUtils from '../../../src/chains/cardano/helpers/CardanoUtils';
import CardanoConfigs from '../../../src/chains/cardano/helpers/CardanoConfigs';
import { Fee } from '@rosen-bridge/minimum-fee';
import { mockGetFee } from '../../guard/mocked/MockedMinimumFee';
import CardanoTxVerifier from '../../../src/chains/cardano/CardanoTxVerifier';

describe('CardanoTxVerifier', () => {
  const testBankAddress = TestBoxes.testBankAddress;

  describe('verifyTransactionWithEvent', () => {
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an ADA payment tx that transferring asset', async () => {
      // mock ada payment event
      const mockedEvent: EventTrigger = TestBoxes.mockADAPaymentEventTrigger();
      const tx = TestBoxes.mockAssetTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
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
    it('should reject an Asset payment tx with no asset transferring', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockNoAssetsTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
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
    it('should reject an Asset payment tx that transferring multiple asset with same policyId', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockMultiAssetsTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
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
    it('should reject an Asset payment tx that transferring multiple asset with different policyId', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockTwoAssetsTransferringPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
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
     * Scenario:
     *    Mock a valid eventTrigger
     *    Create a valid mock payment transaction for the eventTrigger
     *    Validates the transaction
     * Expected Output:
     *    It should verify the transaction
     */
    it('should accept a valid payment tx', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockValidPaymentTransaction(
        mockedEvent,
        testBankAddress
      );

      // run test
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.true;
    });

    /**
     * Target: testing verifyTransactionWithEvent
     * Dependencies:
     *    -
     * Scenario:
     *    Mock a valid eventTrigger
     *    Create an invalid mock payment transaction with metadata
     *    Validates the transaction to false
     * Expected Output:
     *    It should NOT verify the transaction
     */
    it('should reject an invalid payment tx containing metadata', async () => {
      // mock asset payment event
      const mockedEvent: EventTrigger =
        TestBoxes.mockAssetPaymentEventTrigger();
      const tx = TestBoxes.mockPaymentTransactionWithMetadata(
        mockedEvent,
        testBankAddress
      );

      // run test
      const isValid = await CardanoTxVerifier.verifyTransactionWithEvent(
        tx,
        mockedEvent,
        mockedFeeConfig
      );
      expect(isValid).to.be.false;
    });
  });

  describe('verifyEventWithPayment', () => {
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('reset mocked koios api', () => {
      mockKoiosGetTxInfo(
        TestData.observationTxInfo.tx_hash,
        TestData.observationTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.nonObservationTxInfo.tx_hash,
        TestData.nonObservationTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.adaObservationTxInfo.tx_hash,
        TestData.adaObservationTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.noMetadataTxInfo.tx_hash,
        TestData.noMetadataTxInfo
      );
      mockKoiosGetTxInfo(
        TestData.fakeTokenObservationTxInfo.tx_hash,
        TestData.fakeTokenObservationTxInfo
      );
      mockGetFee(mockedFeeConfig);
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    -
     * Expected Output:
     *    It should verify the event
     */
    it('should return true when the event is correct', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event amount is less than the event fees', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();

      // mock fee config so that amount is less than event fees
      const highBridgeFeeConfig: Fee = {
        bridgeFee: 5000n,
        networkFee: 0n,
        rsnRatio: 0n,
      };
      mockGetFee(highBridgeFeeConfig);

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return true when the event is correct locking ada', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidAdaEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has no metadata', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInValidMetadataEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it("should return false when the event token doesn't match", async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInValidTokenEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect toChain', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidToChainEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect fromAddress', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidFromAddressEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect toAddress', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidToAddressEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect amount', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidAmountEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect networkFee', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidNetworkFeeEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect bridgeFee', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidBridgeFeeEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect sourceTokenId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidSourceTokenEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect targetTokenId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidTargetTokenEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect blockId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidBlockEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event has incorrect sourceTxId', async () => {
      const mockedEvent: EventTrigger =
        TestBoxes.mockInvalidSourceTxEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
      );
      expect(isValid).to.be.false;
    });

    /**
     * Target: testing verifyEventWithPayment
     * Dependencies:
     *    CardanoUtils
     * Expected Output:
     *    It should NOT verify the event
     */
    it('should return false when the event can not be retrieved from tx info', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();
      sinon.stub(CardanoUtils, 'getRosenData').returns(undefined);

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        CardanoConfigs.cardanoContractConfig.RWTId
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
    it('should return false when the event RWT is not compatible with cardano rwt', async () => {
      const mockedEvent: EventTrigger = TestBoxes.mockValidEventTrigger();

      // run test
      const isValid = await CardanoTxVerifier.verifyEventWithPayment(
        mockedEvent,
        'fake'
      );
      expect(isValid).to.be.false;
    });
  });
});
