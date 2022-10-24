import { expect } from 'chai';
import { EventTrigger } from '../../../src/models/Models';
import EventProcessor from '../../../src/guard/event/EventProcessor';
import {
  resetMockedEventProcessor,
  verifyCreateEventPaymentCalledOnce,
  verifyCreateEventPaymentDidntGetCalled,
} from '../mocked/MockedEventProcessor';
import CardanoTestBoxes from '../../chains/cardano/testUtils/TestBoxes';
import {
  allEventRecords,
  clearTables,
  insertEventRecord,
  insertOnyEventDataRecord,
} from '../../db/mocked/MockedScannerModel';
import {
  mockStartAgreementProcess,
  resetMockedTxAgreement,
  verifyStartAgreementProcessCalledOnce,
} from '../mocked/MockedTxAgreement';
import MockedCardanoChain from '../../chains/mocked/MockedCardanoChain';
import MockedErgoChain from '../../chains/mocked/MockedErgoChain';
import ErgoTestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import TestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import {
  mockRewardGenerateTransaction,
  resetMockedReward,
  verifyRewardGenerateTransactionCalledOnce,
} from '../../chains/mocked/MockedReward';
import ErgoUtils from '../../../src/chains/ergo/helpers/ErgoUtils';
import {
  mockIsEventConfirmedEnough,
  mockVerifyEvent,
  resetMockedEventVerifier,
} from '../mocked/MockedEventVerifier';
import { mockGetFee } from '../mocked/MockedMinimumFee';
import { Fee } from '@rosen-bridge/minimum-fee';

describe('EventProcessor', () => {
  const cardanoTestBankAddress = CardanoTestBoxes.testBankAddress;
  const ergoEventBoxAndCommitments =
    TestBoxes.mockEventBoxWithSomeCommitments();

  const mockedCardanoChain = new MockedCardanoChain(
    EventProcessor.cardanoChain
  );
  const mockedErgoChain = new MockedErgoChain(EventProcessor.ergoChain);

  describe('processEvent', () => {
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('reset isEventConfirmedEnough mock', async () => {
      await clearTables();
      resetMockedEventVerifier();
      resetMockedEventProcessor();
      resetMockedTxAgreement();
      mockGetFee(mockedFeeConfig);
    });

    /**
     * Target: testing processPaymentEvent
     * Dependencies:
     *    EventProcessor
     * Expected Output:
     *    The function should update event info in db
     */
    it("should mark event as rejected when didn't verify on source chain", async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      await insertEventRecord(mockedEvent, 'pending-payment');
      mockVerifyEvent(mockedEvent, false);

      // run test
      await EventProcessor.processConfirmedEvents();

      // verify
      verifyCreateEventPaymentDidntGetCalled(mockedEvent);
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), 'rejected']);
    });

    /**
     * Target: testing processPaymentEvent
     * Dependencies:
     *    EventProcessor
     *    CardanoChain
     *    txAgreement
     * Expected Output:
     *    The function should create tx
     *    The function should start agreement process
     */
    it('should create cardano tx for event and send to agreement process', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      await insertEventRecord(mockedEvent, 'pending-payment');
      mockVerifyEvent(mockedEvent, true);

      // mock tx
      const tx = CardanoTestBoxes.mockMultiAssetsTransferringPaymentTransaction(
        mockedEvent,
        cardanoTestBankAddress
      );
      mockedCardanoChain.mockGenerateTransaction(mockedEvent, tx);
      mockStartAgreementProcess(tx);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // verify
      verifyCreateEventPaymentCalledOnce(mockedEvent);
      verifyStartAgreementProcessCalledOnce(tx);
    });

    /**
     * Target: testing processPaymentEvent
     * Dependencies:
     *    EventProcessor
     *    ErgoChain
     *    txAgreement
     * Expected Output:
     *    The function should create tx
     *    The function should start agreement process
     */
    it('should create ergo tx for event and send to agreement process', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(mockedEvent, 'pending-payment');
      mockVerifyEvent(mockedEvent, true);

      // mock tx
      const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(
        mockedEvent,
        ergoEventBoxAndCommitments
      );
      mockedErgoChain.mockGenerateTransaction(mockedEvent, tx);
      mockStartAgreementProcess(tx);

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // verify
      verifyCreateEventPaymentCalledOnce(mockedEvent);
      verifyStartAgreementProcessCalledOnce(tx);
    });
  });

  describe('processRewardEvent', () => {
    const mockedFeeConfig: Fee = {
      bridgeFee: 0n,
      networkFee: 0n,
      rsnRatio: 0n,
    };

    beforeEach('clear db tables', async () => {
      await clearTables();
      resetMockedReward();
      resetMockedTxAgreement();
      mockGetFee(mockedFeeConfig);
    });

    /**
     * Target: testing processRewardEvent
     * Dependencies:
     *    Reward
     *    txAgreement
     * Expected Output:
     *    The function should create tx
     *    The function should start agreement process
     */
    it('should create reward distribution tx for event and send to agreement process', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenRewardEventTrigger();
      await insertEventRecord(mockedEvent, 'pending-reward');

      // mock tx
      const tx = ErgoTestBoxes.mockTokenBurningTokenDistributionTransaction(
        mockedEvent,
        ergoEventBoxAndCommitments
      );
      mockRewardGenerateTransaction(mockedEvent, tx);
      mockStartAgreementProcess(tx);

      // run test
      await EventProcessor.processConfirmedEvents();

      // verify
      verifyRewardGenerateTransactionCalledOnce(mockedEvent);
      verifyStartAgreementProcessCalledOnce(tx);
    });
  });

  describe('processScannedEvents', () => {
    beforeEach('clear db tables', async () => {
      await clearTables();
      resetMockedEventProcessor();
    });

    /**
     * Target: testing processScannedEvents
     * Dependencies:
     *    isEventConfirmedEnough
     *    dbAction
     * Scenario:
     *    Insert a mocked event box into db
     *    Mock it as not confirmed
     *    Run test
     *    Expect no insertion into table of db
     * Expected Output:
     *    The function should NOT insert event into db
     */
    it('should NOT inserts not confirmed events into ConfirmedEvent table', async () => {
      const mockedEvent = TestBoxes.mockErgPaymentEventTrigger();
      const boxSerialized = ErgoUtils.ergoBoxToSigmaSerialized(
        TestBoxes.mockSingleBox(
          1,
          [],
          ErgoUtils.addressStringToContract(TestBoxes.testLockAddress)
        ) // address doesn't matter in this test
      );
      await insertOnyEventDataRecord(mockedEvent, boxSerialized);
      mockIsEventConfirmedEnough(mockedEvent, false);

      // run test
      await EventProcessor.processScannedEvents();

      // verify
      const dbEvents = await allEventRecords();
      expect(dbEvents.length).to.equal(0);
    });

    /**
     * Target: testing processScannedEvents
     * Dependencies:
     *    isEventConfirmedEnough
     *    dbAction
     * Scenario:
     *    Insert a mocked event box into db twice
     *    Mock it as confirmed
     *    Run test
     *    Expect to see only confirmed event in ConfirmedEvent table of db
     * Expected Output:
     *    The function should insert just one event into db
     */
    it('should only inserts one event per sourceTxId into ConfirmedEvent table', async () => {
      const mockedEvent = TestBoxes.mockErgPaymentEventTrigger();
      const boxSerialized1 = ErgoUtils.ergoBoxToSigmaSerialized(
        TestBoxes.mockSingleBox(
          1,
          [],
          ErgoUtils.addressStringToContract(TestBoxes.testLockAddress)
        ) // address doesn't matter in this test
      );
      const boxSerialized2 = ErgoUtils.ergoBoxToSigmaSerialized(
        TestBoxes.mockSingleBox(
          1,
          [],
          ErgoUtils.addressStringToContract(TestBoxes.testLockAddress)
        ) // address doesn't matter in this test
      );
      await insertOnyEventDataRecord(mockedEvent, boxSerialized1);
      await insertOnyEventDataRecord(mockedEvent, boxSerialized2);
      mockIsEventConfirmedEnough(mockedEvent, true);

      // run test
      await EventProcessor.processScannedEvents();

      // verify
      const dbEvents = await allEventRecords();
      expect(dbEvents.length).to.equal(1);
      expect(dbEvents[0].id).to.equal(mockedEvent.getId());
    });
  });
});
