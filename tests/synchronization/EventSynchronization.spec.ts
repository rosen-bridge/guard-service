import TestEventSynchronization from './TestEventSynchronization';
import * as EventTestData from '../event/testData';
import TestConfigs from '../testUtils/TestConfigs';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import {
  mockIsEventConfirmedEnough,
  mockVerifyEvent,
} from '../verification/mocked/EventVerifier.mock';
import { mockGetEventFeeConfig } from '../event/mocked/MinimumFee.mock';
import EventSerializer from '../../src/event/EventSerializer';
import GuardPkHandler from '../../src/handlers/GuardPkHandler';
import TestUtils from '../testUtils/TestUtils';
import { mockPaymentTransaction } from '../agreement/testData';
import {
  ConfirmationStatus,
  PaymentOrder,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { SynchronizationMessageTypes } from '../../src/synchronization/Interfaces';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { mockCreateEventPaymentOrder } from '../event/mocked/EventOrder.mock';
import Configs from '../../src/configs/Configs';

describe('EventSynchronization', () => {
  describe('addEventToQueue', () => {
    /**
     * @target EventSynchronization.addEventToQueue should add the event to the memory queue
     * @dependencies
     * @scenario
     * - run test
     * - check events in memory
     * @expected
     * - memory queue should contains mocked event
     */
    it('should add the event to the memory queue', async () => {
      // run test
      const eventId = 'event-id';
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);

      // check events in memory
      const queue = eventSync.getEventQueue();
      expect(queue).toEqual([eventId]);
    });
  });

  describe('processSyncQueue', () => {
    const guardsLen = Configs.tssKeys.pubs.length;

    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
        rsnRatioDivisor: 1000000000000n,
        feeRatioDivisor: 10000n,
      });
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventSynchronization.processSyncQueue should add event to active sync
     * when event is verified
     * @dependencies
     * - Date
     * - database
     * - EventVerifier
     * - MinimumFee
     * @scenario
     * - mock event
     * - insert mocked event into db
     * - insert event into queue
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     * - run test
     * - check active syncs in memory
     * @expected
     * - mocked event should be in memory
     * - mocked event sync responses should be initiated
     * - memory queue should be empty
     */
    it('should add event to active sync when event is verified', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into queue
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);

      // run test
      await eventSync.processSyncQueue();

      // check active syncs in memory
      const activeSyncs = eventSync.getActiveSyncMap();
      expect(activeSyncs.get(eventId)).toEqual({
        timestamp: TestConfigs.currentTimeStamp / 1000,
        responses: Array(guardsLen).fill(undefined),
      });
      expect(eventSync.getEventQueue().length).toEqual(0);
    });

    /**
     * @target EventSynchronization.processSyncQueue should NOT add event to active sync
     * when there are already maximum number of events in active syncs
     * @dependencies
     * - Date
     * - database
     * - EventVerifier
     * - MinimumFee
     * @scenario
     * - mock event
     * - insert mocked event into db
     * - insert event into queue
     * - insert 3 events into active sync
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     * - run test
     * - check active syncs in memory
     * @expected
     * - mocked event should still be in queue
     * - active sync map length should still be 3
     */
    it('should NOT add event to active sync when there are already maximum number of events in active syncs', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into queue
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);

      // insert 3 events into active sync
      for (let i = 0; i < 3; i++) {
        eventSync.insertEventIntoActiveSync(TestUtils.generateRandomId(), {
          timestamp: TestConfigs.currentTimeStamp,
          responses: [],
        });
      }

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);

      // run test
      await eventSync.processSyncQueue();

      // check active syncs in memory
      const activeSyncs = eventSync.getActiveSyncMap();
      expect(activeSyncs.size).toEqual(3);
      expect(eventSync.getEventQueue()).toEqual([eventId]);
    });

    /**
     * @target EventSynchronization.processSyncQueue should skip event when event
     * is already in active sync
     * @dependencies
     * - Date
     * - database
     * - EventVerifier
     * - MinimumFee
     * @scenario
     * - mock event
     * - insert mocked event into db
     * - insert event into queue and active sync
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     * - run test
     * - check active syncs in memory
     * @expected
     * - active sync should remain unchanged
     * - memory queue should be empty
     */
    it('should skip event when event is already in active sync', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into queue and active sync
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;
      const responses = Array(guardsLen).fill(undefined);
      responses[2] = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain
      );
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: timestamp,
        responses: responses,
      });

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);

      // run test
      await eventSync.processSyncQueue();

      // check active syncs in memory
      const activeSyncs = eventSync.getActiveSyncMap();
      expect(activeSyncs.size).toEqual(1);
      expect(activeSyncs.get(eventId)).toEqual({
        timestamp: timestamp,
        responses: responses,
      });
      expect(eventSync.getEventQueue().length).toEqual(0);
    });

    /**
     * @target EventSynchronization.processSyncQueue should skip event when event
     * is not in the database
     * @dependencies
     * - Date
     * - database
     * - EventVerifier
     * - MinimumFee
     * @scenario
     * - mock event
     * - insert event into queue
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     * - run test
     * - check active syncs in memory
     * @expected
     * - active sync should remain empty
     * - memory queue should be empty
     */
    it('should skip event when event is not in the database', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert event into queue
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);

      // run test
      await eventSync.processSyncQueue();

      // check active syncs in memory
      const activeSyncs = eventSync.getActiveSyncMap();
      expect(activeSyncs.size).toEqual(0);
      expect(eventSync.getEventQueue().length).toEqual(0);
    });

    /**
     * @target EventSynchronization.processSyncQueue should skip event when event
     * is not confirmed enough
     * @dependencies
     * - Date
     * - database
     * - EventVerifier
     * - MinimumFee
     * @scenario
     * - mock event
     * - insert mocked event into db
     * - insert event into queue
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough` to return false
     *   - mock `verifyEvent`
     * - run test
     * - check active syncs in memory
     * @expected
     * - active sync should remain empty
     * - memory queue should be empty
     */
    it('should skip event when event is not confirmed enough', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into queue
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);

      // mock EventVerifier
      mockIsEventConfirmedEnough(false);
      mockVerifyEvent(true);

      // run test
      await eventSync.processSyncQueue();

      // check active syncs in memory
      const activeSyncs = eventSync.getActiveSyncMap();
      expect(activeSyncs.size).toEqual(0);
      expect(eventSync.getEventQueue().length).toEqual(0);
    });

    /**
     * @target EventSynchronization.processSyncQueue should set event as rejected when event
     * is not verified
     * @dependencies
     * - Date
     * - database
     * - EventVerifier
     * - MinimumFee
     * @scenario
     * - mock event
     * - insert mocked event into db
     * - insert event into queue
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent` to return false
     * - run test
     * - check active syncs in memory
     * @expected
     * - active sync should remain empty
     * - memory queue should be empty
     * - event status should be updated in db
     */
    it('should set event as rejected when event is not verified', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into queue
      const eventSync = new TestEventSynchronization();
      eventSync.addEventToQueue(eventId);

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(false);

      // run test
      await eventSync.processSyncQueue();

      // check active syncs in memory
      const activeSyncs = eventSync.getActiveSyncMap();
      expect(activeSyncs.size).toEqual(0);
      expect(eventSync.getEventQueue().length).toEqual(0);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([
        EventSerializer.getId(mockedEvent),
        EventStatus.rejected,
      ]);
    });
  });

  describe('sendSyncBatch', () => {
    const guardIndex = TestConfigs.guardIndex;
    const guardsLen = Configs.tssKeys.pubs.length;
    const publicKeys = Configs.tssKeys.pubs.map((pub) => pub.curvePub);

    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    /**
     * @target EventSynchronization.sendSyncBatch should send sync request to random
     * guards for each events
     * @dependencies
     * - Date
     * - GuardDetection
     * @scenario
     * - mock two events
     * - insert events into active sync
     * - mock EventSynchronization.sendMessage
     * - mock detection.activeGuards
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should got called with expected arguments
     */
    it('should send sync request to random guards for each events', async () => {
      // mock two events
      const mockedEvent1 = EventTestData.mockEventTrigger().event;
      const eventId1 = EventSerializer.getId(mockedEvent1);
      const mockedEvent2 = EventTestData.mockEventTrigger().event;
      const eventId2 = EventSerializer.getId(mockedEvent2);

      // insert events into active sync
      const eventSync = new TestEventSynchronization();
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;
      eventSync.insertEventIntoActiveSync(eventId1, {
        timestamp: timestamp,
        responses: Array(guardsLen).fill(undefined),
      });
      eventSync.insertEventIntoActiveSync(eventId2, {
        timestamp: timestamp,
        responses: Array(guardsLen).fill(undefined),
      });

      // mock EventSynchronization.sendMessage
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // mock detection.activeGuards
      vi.spyOn((eventSync as any).detection, 'activeGuards').mockResolvedValue(
        publicKeys.map((pk, index) => ({
          publicKey: pk,
          peerId: `peer-${index}`,
          index: index,
        }))
      );

      // run test
      await eventSync.sendSyncBatch();

      // `sendMessage` should got called with expected arguments
      expect(mockedSendMessage).toHaveBeenCalledWith(
        SynchronizationMessageTypes.request,
        { eventId: eventId1 },
        expect.not.arrayContaining([`peer-${guardIndex}`]),
        TestConfigs.currentTimeStamp / 1000
      );
      expect(mockedSendMessage).toHaveBeenCalledWith(
        SynchronizationMessageTypes.request,
        { eventId: eventId2 },
        expect.not.arrayContaining([`peer-${guardIndex}`]),
        TestConfigs.currentTimeStamp / 1000
      );
    });

    /**
     * @target EventSynchronization.sendSyncBatch should send sync request only to
     * the guards that didn't response yet
     * @dependencies
     * - Date
     * - GuardDetection
     * @scenario
     * - mock event
     * - insert event into active sync
     * - mock EventSynchronization.sendMessage
     * - mock detection.activeGuards
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should got called with expected arguments
     */
    it("should send sync request only to the guards that didn't response yet", async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = [
        ...Array(guardsLen - 2).fill(mockPaymentTransaction()),
        undefined,
        undefined,
      ];
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock EventSynchronization.sendMessage
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // mock detection.activeGuards
      vi.spyOn((eventSync as any).detection, 'activeGuards').mockResolvedValue(
        publicKeys.map((pk, index) => ({
          publicKey: pk,
          peerId: `peer-${index}`,
          index: index,
        }))
      );

      // run test
      await eventSync.sendSyncBatch();

      // `sendMessage` should got called with expected arguments
      expect(mockedSendMessage).toHaveBeenCalledWith(
        SynchronizationMessageTypes.request,
        { eventId: eventId },
        expect.arrayContaining([
          `peer-${guardsLen - 1}`,
          `peer-${guardsLen - 2}`,
        ]),
        TestConfigs.currentTimeStamp / 1000
      );
      expect((mockedSendMessage.mock.lastCall as any[])[2].length).toEqual(2);
    });

    /**
     * @target EventSynchronization.sendSyncBatch should not send any request when
     * selected guards are not active
     * @dependencies
     * - Date
     * - GuardDetection
     * @scenario
     * - mock event
     * - insert events into active sync
     * - mock EventSynchronization.sendMessage
     * - mock detection.activeGuards
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should NOT got called
     */
    it('should not send any request when selected guards are not active', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // insert events into active sync
      const eventSync = new TestEventSynchronization();
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: Array(guardsLen).fill(undefined),
      });

      // mock EventSynchronization.sendMessage
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // mock detection.activeGuards
      vi.spyOn((eventSync as any).detection, 'activeGuards').mockResolvedValue(
        []
      );

      // run test
      await eventSync.sendSyncBatch();

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('processSyncRequest', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventSynchronization.processSyncRequest should send sync response when
     * event has a completed tx in payment type
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and transaction and insert into db
     * - mock EventSynchronization.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should got called with expected arguments
     */
    it('should send sync response when event has a completed tx in payment type', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.completed);

      // mock EventSynchronization.sendMessage
      const eventSync = new TestEventSynchronization();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.request,
        { eventId: eventId },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `sendMessage` should got called with expected arguments
      expect(mockedSendMessage).toHaveBeenCalledWith(
        SynchronizationMessageTypes.response,
        { txJson: tx.toJson() },
        expect.any(Array),
        TestConfigs.currentTimeStamp / 1000
      );
    });

    /**
     * @target EventSynchronization.processSyncRequest should do nothing when event is not found
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock EventSynchronization.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should NOT got called
     */
    it('should do nothing when event is not found', async () => {
      // mock EventSynchronization.sendMessage
      const eventSync = new TestEventSynchronization();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.request,
        { eventId: 'event-id' },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalledWith();
    });

    /**
     * @target EventSynchronization.processSyncRequest should do nothing when event has no transaction
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event insert into db
     * - mock EventSynchronization.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should NOT got called
     */
    it('should do nothing when event has no transaction', async () => {
      // mock event insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward
      );

      // mock EventSynchronization.sendMessage
      const eventSync = new TestEventSynchronization();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.request,
        { eventId: eventId },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalledWith();
    });

    /**
     * @target EventSynchronization.processSyncRequest should do nothing when tx is not completed
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and transaction and insert into db
     * - mock EventSynchronization.sendMessage
     * - run test
     * - check if function got called
     * @expected
     * - `sendMessage` should NOT got called
     */
    it('should do nothing when tx is not completed', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.sent);

      // mock EventSynchronization.sendMessage
      const eventSync = new TestEventSynchronization();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventSync as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.request,
        { eventId: eventId },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `sendMessage` should NOT got called
      expect(mockedSendMessage).not.toHaveBeenCalledWith();
    });
  });

  describe('processSyncResponse', () => {
    const guardsLen = Configs.tssKeys.pubs.length;
    const requiredApproval = GuardPkHandler.getInstance().requiredSign - 1;

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventSynchronization.processSyncResponse should set tx as approved when
     * enough guards responded a transaction
     * @dependencies
     * - database
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock EventSynchronization
     *   - mock `verifySynchronizationResponse`
     *   - mock `setTxAsApproved`
     * - run test
     * - check if function got called
     * @expected
     * - `setTxAsApproved` should got called
     */
    it('should set tx as approved when enough guards responded a transaction', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = [
        undefined,
        ...Array(requiredApproval - 1).fill(tx),
        ...Array(guardsLen - requiredApproval).fill(undefined),
      ];
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock EventSynchronization
      vi.spyOn(
        eventSync as any,
        'verifySynchronizationResponse'
      ).mockResolvedValue(true);
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(eventSync as any, 'setTxAsApproved');
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.response,
        { txJson: tx.toJson() },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `setTxAsApproved` should got called
      expect(mockedSetTxAsApproved).toHaveBeenCalled();
    });

    /**
     * @target EventSynchronization.processSyncResponse should ignore duplicate response
     * @dependencies
     * - database
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock EventSynchronization
     *   - mock `verifySynchronizationResponse`
     *   - mock `setTxAsApproved`
     * - run test
     * - check if function got called
     * @expected
     * - `setTxAsApproved` should NOT got called
     */
    it('should ignore duplicate response', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = [
        ...Array(requiredApproval - 1).fill(tx),
        ...Array(guardsLen - requiredApproval + 1).fill(undefined),
      ];
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock EventSynchronization
      vi.spyOn(
        eventSync as any,
        'verifySynchronizationResponse'
      ).mockResolvedValue(true);
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(eventSync as any, 'setTxAsApproved');
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.response,
        { txJson: tx.toJson() },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `setTxAsApproved` should NOT got called
      expect(mockedSetTxAsApproved).not.toHaveBeenCalled();
    });

    /**
     * @target EventSynchronization.processSyncResponse should do nothing when enough
     * guards didn't response with the same transaction
     * @dependencies
     * - database
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock EventSynchronization
     *   - mock `verifySynchronizationResponse`
     *   - mock `setTxAsApproved`
     * - run test
     * - check if function got called
     * - check active syncs in memory
     * @expected
     * - `setTxAsApproved` should NOT got called
     * - response should be added to active sync
     */
    it("should do nothing when enough guards didn't response with the same transaction", async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      const anotherTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = [
        undefined,
        ...Array(requiredApproval - 2).fill(tx),
        ...Array(requiredApproval - 2).fill(anotherTx),
        ...Array(guardsLen - 2 * requiredApproval + 3).fill(undefined),
      ];
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock EventSynchronization
      vi.spyOn(
        eventSync as any,
        'verifySynchronizationResponse'
      ).mockResolvedValue(true);
      const mockedSetTxAsApproved = vi.fn();
      const setTxAsApprovedSpy = vi.spyOn(eventSync as any, 'setTxAsApproved');
      setTxAsApprovedSpy.mockImplementation(mockedSetTxAsApproved);

      // run test
      await eventSync.processMessage(
        SynchronizationMessageTypes.response,
        { txJson: tx.toJson() },
        'signature',
        0,
        'peer-0',
        TestConfigs.currentTimeStamp / 1000
      );

      // `setTxAsApproved` should NOT got called
      expect(mockedSetTxAsApproved).not.toHaveBeenCalled();

      // response should be added to active sync
      const activeSync = eventSync.getActiveSyncMap();
      expect(activeSync.get(eventId)?.responses.map((_) => _?.txId)).toEqual(
        [tx, ...responses.slice(1)].map((_) => _?.txId)
      );
    });
  });

  describe(`verifySynchronizationResponse`, () => {
    const guardsLen = Configs.tssKeys.pubs.length;

    beforeAll(() => {
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
        rsnRatioDivisor: 1000000000000n,
        feeRatioDivisor: 10000n,
      });
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      ChainHandlerMock.resetMock();
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return true
     * when all conditions are met
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus`
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions are met', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when event has no active sync
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus`
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event has no active sync', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const eventSync = new TestEventSynchronization();
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when transaction type is not payment
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus`
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction type is not payment', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.manual,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when transaction object is not consistent
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction` to return false
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus`
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction object is not consistent', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        false,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when transaction order is not verified
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus`
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return different order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction order is not verified', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder([
        {
          address: 'different-address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ]);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when transaction is not confirmed enough
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus` to return NotConfirmedEnough
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction is not confirmed enough', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when transaction is not found
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus` to return NotFound
     *   - mock `verifyTransactionExtraConditions`
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction is not found', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.NotFound,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        true,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target EventSynchronization.verifySynchronizationResponse should return false
     * when transaction extra conditions are not verified
     * @dependencies
     * - database
     * - ChainHandler
     * - MinimumFee
     * - EventOrder
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - mock a PaymentOrder
     * - mock ChainHandler `getChain`
     *   - mock `verifyPaymentTransaction`
     *   - mock `extractTransactionOrder`
     *   - mock `getTxConfirmationStatus`
     *   - mock `verifyTransactionExtraConditions` to return false
     * - mock EventOrder.createEventPaymentOrder to return mocked order
     * - run test
     * - check returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction extra conditions are not verified', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(guardsLen).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // mock a PaymentOrder
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];

      // mock ChainHandler
      ChainHandlerMock.mockChainName(mockedEvent.toChain);
      // mock `verifyPaymentTransaction`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyPaymentTransaction',
        true,
        true
      );
      // mock `extractTransactionOrder`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'extractTransactionOrder',
        mockedOrder,
        false
      );
      // mock `getTxConfirmationStatus`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'getTxConfirmationStatus',
        ConfirmationStatus.ConfirmedEnough,
        false
      );
      // mock `verifyTransactionExtraConditions`
      ChainHandlerMock.mockChainFunction(
        mockedEvent.toChain,
        'verifyTransactionExtraConditions',
        false,
        false
      );

      // mock EventOrder.createEventPaymentOrder to return mocked order
      mockCreateEventPaymentOrder(mockedOrder);

      // run test
      const result = await eventSync.callVerifySynchronizationResponse(tx);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe(`setTxAsApproved`, () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventSynchronization.setTxAsApproved should insert transaction
     * into database and update event status
     * @dependencies
     * - database
     * @scenario
     * - mock event and transaction and insert into db
     * - insert event into active sync
     * - run test
     * - check database
     * - check active syncs in memory
     * @expected
     * - tx should be inserted into db
     * - event status should be updated in db
     * - event should be removed from active sync
     */
    it('should insert transaction into database and update event status', async () => {
      // mock event and transaction and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert event into active sync
      const eventSync = new TestEventSynchronization();
      const responses = Array(Configs.tssKeys.pubs.length).fill(undefined);
      eventSync.insertEventIntoActiveSync(eventId, {
        timestamp: TestConfigs.currentTimeStamp / 1000 - 100,
        responses: responses,
      });

      // run test
      await eventSync.callSetTxAsApproved(paymentTx);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.txJson,
        tx.event.id,
        tx.status,
      ]);
      expect(dbTxs.length).toEqual(1);
      expect(dbTxs).to.deep.contain([
        paymentTx.txId,
        paymentTx.toJson(),
        eventId,
        TransactionStatus.completed,
      ]);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.pendingReward]);

      // event should be removed from active sync
      expect(eventSync.getActiveSyncMap().size).toEqual(0);
    });
  });

  describe('timeoutActiveSyncs', () => {
    const guardsLen = Configs.tssKeys.pubs.length;

    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    /**
     * @target EventSynchronization.timeoutActiveSyncs should remove event from
     * active sync when enough time is passed
     * @dependencies
     * - Date
     * @scenario
     * - mock two events
     * - insert events into active sync
     * - run test
     * - check active syncs in memory
     * @expected
     * - one event should be removed from active sync
     */
    it('should remove event from active sync when enough time is passed', async () => {
      // mock two events
      const mockedEvent1 = EventTestData.mockEventTrigger().event;
      const eventId1 = EventSerializer.getId(mockedEvent1);
      const mockedEvent2 = EventTestData.mockEventTrigger().event;
      const eventId2 = EventSerializer.getId(mockedEvent2);

      // insert events into active sync
      const eventSync = new TestEventSynchronization();
      eventSync.insertEventIntoActiveSync(eventId1, {
        timestamp:
          TestConfigs.currentTimeStamp / 1000 - Configs.eventSyncTimeout - 100,
        responses: Array(guardsLen).fill(undefined),
      });
      const event2ActiveSync = {
        timestamp:
          TestConfigs.currentTimeStamp / 1000 - Configs.eventSyncTimeout + 100,
        responses: Array(guardsLen).fill(undefined),
      };
      eventSync.insertEventIntoActiveSync(eventId2, event2ActiveSync);

      // run test
      await eventSync.timeoutActiveSyncs();

      // one event should be removed from active sync
      const activeSyncMap = eventSync.getActiveSyncMap();
      expect(activeSyncMap.size).toEqual(1);
      expect(activeSyncMap.get(eventId2)).toEqual(event2ActiveSync);
    });
  });
});
