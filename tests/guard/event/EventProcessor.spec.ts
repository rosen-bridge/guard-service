import { expect } from 'chai';
import {
  EventStatus,
  EventTrigger,
  TransactionStatus,
} from '../../../src/models/Models';
import EventProcessor from '../../../src/guard/event/EventProcessor';
import {
  resetMockedEventProcessor,
  verifyCreateEventPaymentCalledOnce,
  verifyCreateEventPaymentDidntGetCalled,
} from '../mocked/MockedEventProcessor';
import CardanoTestBoxes from '../../chains/cardano/testUtils/TestBoxes';
import {
  allEventRecords,
  allTxRecords,
  clearTables,
  insertEventRecord,
  insertOnyEventDataRecord,
} from '../../db/mocked/MockedScannerModel';
import {
  mockStartAgreementProcess,
  resetMockedTxAgreement,
  verifyStartAgreementProcessCalledOnce,
  verifyStartAgreementProcessDidntGetCalled,
} from '../mocked/MockedTxAgreement';
import MockedCardanoChain from '../../chains/mocked/MockedCardanoChain';
import MockedErgoChain from '../../chains/mocked/MockedErgoChain';
import ErgoTestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import TestBoxes from '../../chains/ergo/testUtils/TestBoxes';
import {
  mockRewardGenerateTransaction,
  mockRewardGenerateTransactionToThrowError,
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
import { NotEnoughAssetsError } from '../../../src/helpers/errors';
import { reset, spy, when } from 'ts-mockito';
import GuardTurn from '../../../src/helpers/GuardTurn';
import Configs from '../../../src/helpers/Configs';
import {
  resetDiscordNotificationCalls,
  verifyDiscordSendMessageCalledOnce,
} from '../../communication/mocked/MockedDiscordNotification';

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
      resetDiscordNotificationCalls();
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
      ).to.deep.equal([mockedEvent.getId(), EventStatus.rejected]);
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

    /**
     * Target: testing processPaymentEvent
     * Dependencies:
     *    EventProcessor
     *    ErgoChain
     *    txAgreement
     * Scenario:
     *    Mock an event and insert into db
     *    Mock EventVerifier to verify the mocked event
     *    Mock generateTransaction to throw NotEnoughAssetError
     *    Run test
     *    Check TxAgreement startAgreementProcess method. It should not have called
     *    Check DiscordNotification sendMessage method. It should have called one
     *    Check events in db. Mocked event status should be updated to payment-waiting
     * Expected Output:
     *    The function should update event status in db
     */
    it('should mark event as payment-waiting if there are not enough assets to create payment tx', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        CardanoTestBoxes.mockAssetPaymentEventTrigger();
      await insertEventRecord(mockedEvent, 'pending-payment');
      mockVerifyEvent(mockedEvent, true);

      // mock tx generation method
      mockedCardanoChain.mockGenerateTransactionToThrowError(
        mockedEvent,
        new NotEnoughAssetsError('Not enough asset error in tests')
      );

      // run test
      await EventProcessor.processPaymentEvent(mockedEvent);

      // verify
      verifyCreateEventPaymentCalledOnce(mockedEvent);
      verifyDiscordSendMessageCalledOnce();
      verifyStartAgreementProcessDidntGetCalled();

      // verify db changes
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), EventStatus.paymentWaiting]);
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
      resetDiscordNotificationCalls();
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

    /**
     * Target: testing processRewardEvent
     * Dependencies:
     *    EventProcessor
     *    EventVerifier
     *    CardanoChain
     *    txAgreement
     * Scenario:
     *    Mock an event and insert into db
     *    Mock generateTransaction to throw NotEnoughAssetError
     *    Run test
     *    Check TxAgreement startAgreementProcess method. It should not have called
     *    Check DiscordNotification sendMessage method. It should have called one
     *    Check events in db. Mocked event status should be updated to payment-waiting
     * Expected Output:
     *    The function should update event status in db
     */
    it('should mark event as reward-waiting if there are not enough assets to create reward distribution tx', async () => {
      // mock token payment event
      const mockedEvent: EventTrigger =
        ErgoTestBoxes.mockTokenRewardEventTrigger();
      await insertEventRecord(mockedEvent, 'pending-reward');

      // mock tx
      mockRewardGenerateTransactionToThrowError(
        mockedEvent,
        new NotEnoughAssetsError('Not enough asset error in tests')
      );

      // run test
      await EventProcessor.processConfirmedEvents();

      // verify
      verifyRewardGenerateTransactionCalledOnce(mockedEvent);
      verifyDiscordSendMessageCalledOnce();
      verifyStartAgreementProcessDidntGetCalled();

      // verify db changes
      const dbEvents = await allEventRecords();
      expect(
        dbEvents.map((event) => [event.id, event.status])[0]
      ).to.deep.equal([mockedEvent.getId(), EventStatus.rewardWaiting]);
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

  describe('TimeoutLeftoverEvents', () => {
    const currentTimeStamp = 1658005354291000;

    beforeEach('clear db tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing TimeoutLeftoverEvents
     * Dependencies:
     *    EventProcessor
     * Scenario:
     *    Mock Date to return testing currentTimeStamp
     *    Mock four events and insert into db (different in firstTry column and type (payment, reward))
     *    Run test
     *    Check events in db. Two events should got timeout
     *    Reset mocked Date
     * Expected Output:
     *    The function should update events status in db
     */
    it('should mark events as timeout if enough seconds passed from firstTry', async () => {
      // mock Date
      const date = spy(Date);
      when(date.now()).thenReturn(currentTimeStamp);

      // mock events
      const firstTry1 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout - 100;
      const mockedEvent1: EventTrigger =
        ErgoTestBoxes.mockTokenRewardEventTrigger();
      const firstTry2 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout + 100;
      const mockedEvent2: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      const firstTry3 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout + 100;
      const mockedEvent3: EventTrigger =
        ErgoTestBoxes.mockTokenRewardEventTrigger();
      const firstTry4 =
        Math.round(currentTimeStamp / 1000) - Configs.eventTimeout - 100;
      const mockedEvent4: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(
        mockedEvent1,
        EventStatus.pendingReward,
        'boxSerialized',
        200,
        String(firstTry1)
      );
      await insertEventRecord(
        mockedEvent2,
        EventStatus.pendingPayment,
        'boxSerialized',
        200,
        String(firstTry2)
      );
      await insertEventRecord(
        mockedEvent3,
        EventStatus.pendingReward,
        'boxSerialized',
        200,
        String(firstTry3)
      );
      await insertEventRecord(
        mockedEvent4,
        EventStatus.pendingPayment,
        'boxSerialized',
        200,
        String(firstTry4)
      );

      // run test
      await EventProcessor.TimeoutLeftoverEvents();

      // verify db changes
      const dbEvents = (await allEventRecords()).map((event) => [
        event.id,
        event.status,
      ]);
      expect(dbEvents).to.deep.contain([
        mockedEvent1.getId(),
        EventStatus.timeout,
      ]);
      expect(dbEvents).to.deep.contain([
        mockedEvent2.getId(),
        EventStatus.pendingPayment,
      ]);
      expect(dbEvents).to.deep.contain([
        mockedEvent3.getId(),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).to.deep.contain([
        mockedEvent4.getId(),
        EventStatus.timeout,
      ]);

      // reset mocked Date object
      reset(date);
    });
  });

  describe('RequeueWaitingEvents', () => {
    beforeEach('clear db tables', async () => {
      await clearTables();
    });

    /**
     * Target: testing RequeueWaitingEvents
     * Dependencies:
     *    EventProcessor
     * Scenario:
     *    Mock two events and insert into db with status waiting (different in type (payment, reward))
     *    Run test
     *    Check events in db. Events status should updated to pending
     * Expected Output:
     *    The function should update events status in db
     */
    it('should mark timeout events as pending', async () => {
      // mock events
      const mockedEvent1: EventTrigger =
        ErgoTestBoxes.mockTokenRewardEventTrigger();
      const mockedEvent2: EventTrigger =
        ErgoTestBoxes.mockTokenPaymentEventTrigger();
      await insertEventRecord(mockedEvent1, EventStatus.rewardWaiting);
      await insertEventRecord(mockedEvent2, EventStatus.paymentWaiting);

      // run test
      await EventProcessor.RequeueWaitingEvents();

      // verify db changes
      const dbEvents = (await allEventRecords()).map((event) => [
        event.id,
        event.status,
      ]);
      expect(dbEvents).to.deep.contain([
        mockedEvent1.getId(),
        EventStatus.pendingReward,
      ]);
      expect(dbEvents).to.deep.contain([
        mockedEvent2.getId(),
        EventStatus.pendingPayment,
      ]);
    });
  });
});
