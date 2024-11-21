import * as EventTestData from '../event/testData';
import TestConfigs from '../testUtils/TestConfigs';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import {
  ReprocessMessageTypes,
  ReprocessStatus,
} from '../../src/reprocess/Interfaces';
import EventReprocess from '../../src/reprocess/EventReprocess';
import EventSerializer from '../../src/event/EventSerializer';
import { EventStatus } from '../../src/utils/constants';
import TestUtils from '../testUtils/TestUtils';
import { NotFoundError } from '@rosen-chains/abstract-chain';

describe('EventReprocess', async () => {
  await EventReprocess.init();
  describe('sendReprocessRequest', () => {
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
     * @target EventReprocess.sendReprocessRequest should send request messages
     * to other guards and insert them into db
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should be updated in database
     * - the requests should be inserted into database with the same
     *   request id and timestamp
     * - `sendMessage` should got called with expected arguments
     */
    it('should send request messages to other guards and insert them into db', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.timeout
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      const peers = ['peer0', 'peer1', 'peer2', 'peer3'];
      await eventReprocess.sendReprocessRequest(eventId, peers);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.pendingPayment]);

      // the requests should be inserted into database with the same requestId and timestamp
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      const requestId = dbRequests[0].requestId;
      expect(dbRequests.length).toEqual(peers.length);
      for (let i = 0; i < peers.length; i++)
        expect(dbRequests[i]).toEqual({
          id: expect.any(Number),
          requestId: requestId,
          eventId: eventId,
          sender: 'dialer-peer-id',
          receiver: peers[i],
          status: ReprocessStatus.noResponse,
          timestamp: TestConfigs.currentTimeStamp / 1000,
        });

      // `sendMessage` should got called with expected arguments
      expect(sendMessageSpy).toHaveBeenCalledWith(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        peers,
        TestConfigs.currentTimeStamp / 1000
      );
    });

    /**
     * @target EventReprocess.sendReprocessRequest should also update the event
     * to pending-reward when event status is reward-waiting
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should be updated in database
     * - the requests should be inserted into database with the same
     *   request id and timestamp
     * - `sendMessage` should got called with expected arguments
     */
    it('should also update the event to pending-reward when event status is reward-waiting', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.rewardWaiting
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      const peers = ['peer0', 'peer1', 'peer2', 'peer3'];
      await eventReprocess.sendReprocessRequest(eventId, peers);

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.pendingReward]);

      // the requests should be inserted into database with the same requestId and timestamp
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      const requestId = dbRequests[0].requestId;
      expect(dbRequests.length).toEqual(peers.length);
      for (let i = 0; i < peers.length; i++)
        expect(dbRequests[i]).toEqual({
          id: expect.any(Number),
          requestId: requestId,
          eventId: eventId,
          sender: 'dialer-peer-id',
          receiver: peers[i],
          status: ReprocessStatus.noResponse,
          timestamp: TestConfigs.currentTimeStamp / 1000,
        });

      // `sendMessage` should got called with expected arguments
      expect(sendMessageSpy).toHaveBeenCalledWith(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        peers,
        TestConfigs.currentTimeStamp / 1000
      );
    });

    /**
     * @target EventReprocess.sendReprocessRequest should throw NotFoundError
     * when event is not found
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event
     * - mock EventReprocess.sendMessage
     * - run test and expect exception thrown
     * - check database
     * - check if function got called
     * @expected
     * - the event table should remain unchanged
     * - the requests should NOT be inserted into database
     * - `sendMessage` should NOT got called
     */
    it('should throw NotFoundError when event is not found', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test and expect exception thrown
      await expect(async () => {
        await eventReprocess.sendReprocessRequest(eventId, ['peer0', 'peer1']);
      }).rejects.toThrow(NotFoundError);

      // event table should remain unchanged
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(0);

      // the requests should NOT be inserted into database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(0);

      // `sendMessage` should NOT got called
      expect(sendMessageSpy).not.toHaveBeenCalledWith();
    });

    /**
     * @target EventReprocess.sendReprocessRequest should throw Error when
     * event status is unexpected
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - mock EventReprocess.sendMessage
     * - run test and expect exception thrown
     * - check database
     * - check if function got called
     * @expected
     * - the event status should remain unchanged
     * - the requests should NOT be inserted into database
     * - `sendMessage` should NOT got called
     */
    it('should throw Error when event status is unexpected', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test and expect exception thrown
      await expect(async () => {
        await eventReprocess.sendReprocessRequest(eventId, ['peer0', 'peer1']);
      }).rejects.toThrow(Error);

      // the event status should remain unchanged
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.inPayment]);

      // the requests should NOT be inserted into database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(0);

      // `sendMessage` should NOT got called
      expect(sendMessageSpy).not.toHaveBeenCalledWith();
    });
  });

  describe('processReprocessRequest', () => {
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
     * @target EventReprocess.processReprocessRequest should update event status to pending-payment
     * and insert request into db when all conditions are met
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should be updated in database
     * - the request should be added to database
     * - `sendMessage` should got called with expected arguments
     */
    it('should update event status to pending-payment and insert request into db when all conditions are met', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const requestId = '3d547d6f962c7356';
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.timeout
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await EventReprocess.getInstance().processMessage(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        'signature',
        0,
        'peer0',
        timestamp
      );

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.pendingPayment]);

      // the request should be added to database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(1);
      expect(dbRequests[0]).toEqual({
        id: expect.any(Number),
        requestId: requestId,
        eventId: eventId,
        sender: 'peer0',
        receiver: 'dialer-peer-id',
        status: ReprocessStatus.noResponse,
        timestamp: timestamp,
      });

      // `sendMessage` should got called with expected arguments
      expect(sendMessageSpy).toHaveBeenCalledWith(
        ReprocessMessageTypes.response,
        { requestId: requestId, ok: true },
        ['peer0'],
        timestamp
      );
    });

    /**
     * @target EventReprocess.processReprocessRequest should update event status
     * to pending-reward when all conditions are met
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should be updated in database
     * - the request should be added to database
     * - `sendMessage` should got called with expected arguments
     */
    it('should update event status to pending-reward when all conditions are met', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const requestId = '3d547d6f962c7356';
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.rewardWaiting
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await EventReprocess.getInstance().processMessage(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        'signature',
        0,
        'peer0',
        timestamp
      );

      // event status should be updated in db
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.pendingReward]);

      // the request should be added to database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(1);
      expect(dbRequests[0]).toEqual({
        id: expect.any(Number),
        requestId: requestId,
        eventId: eventId,
        sender: 'peer0',
        receiver: 'dialer-peer-id',
        status: ReprocessStatus.noResponse,
        timestamp: timestamp,
      });

      // `sendMessage` should got called with expected arguments
      expect(sendMessageSpy).toHaveBeenCalledWith(
        ReprocessMessageTypes.response,
        { requestId: requestId, ok: true },
        ['peer0'],
        timestamp
      );
    });

    /**
     * @target EventReprocess.processReprocessRequest should do nothing
     * when event is not found
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should remain unchanged
     * - the request should NOT be added to database
     * - `sendMessage` should NOT got called
     */
    it('should do nothing when event is not found', async () => {
      // mock event
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const requestId = '3d547d6f962c7356';
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await EventReprocess.getInstance().processMessage(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        'signature',
        0,
        'peer0',
        timestamp
      );

      // event status should remain unchanged
      const dbEvents = await DatabaseActionMock.allEventRecords();
      expect(dbEvents.length).toEqual(0);

      // the request should NOT be added to database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(0);

      // `sendMessage` should NOT got called
      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    /**
     * @target EventReprocess.processReprocessRequest should do nothing
     * when sender is on cooldown
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - insert a reprocess request into db
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should remain unchanged
     * - the request should NOT be added to database
     * - `sendMessage` should NOT got called
     */
    it('should do nothing when sender is on cooldown', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const requestId = '3d547d6f962c7356';
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.timeout
      );

      // insert a reprocess request into db
      const previousRequestId = '1122334455667788';
      const peerId = 'peer0';
      await DatabaseActionMock.insertReprocessRecord(
        previousRequestId,
        TestUtils.generateRandomId(),
        peerId,
        'dialer-peer-id',
        ReprocessStatus.accepted,
        timestamp - 200
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await EventReprocess.getInstance().processMessage(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        'signature',
        0,
        peerId,
        timestamp
      );

      // event status should remain unchanged
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.timeout]);

      // the request should NOT be added to database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(1);
      expect(dbRequests[0].requestId).toEqual(previousRequestId);

      // `sendMessage` should NOT got called
      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    /**
     * @target EventReprocess.processReprocessRequest should do nothing
     * when event status does not allow reprocess
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock event and insert into db
     * - mock EventReprocess.sendMessage
     * - run test
     * - check database
     * - check if function got called
     * @expected
     * - the event status should remain unchanged
     * - the request should NOT be added to database
     * - `sendMessage` should NOT got called
     */
    it('should do nothing when event status does not allow reprocess', async () => {
      // mock event and insert into db
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const requestId = '3d547d6f962c7356';
      const timestamp = TestConfigs.currentTimeStamp / 1000 - 100;
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.reachedLimit
      );

      // mock EventReprocess.sendMessage
      const eventReprocess = EventReprocess.getInstance();
      const mockedSendMessage = vi.fn();
      const sendMessageSpy = vi.spyOn(eventReprocess as any, 'sendMessage');
      sendMessageSpy.mockImplementation(mockedSendMessage);

      // run test
      await EventReprocess.getInstance().processMessage(
        ReprocessMessageTypes.request,
        { requestId: requestId, eventId: eventId },
        'signature',
        0,
        'peer0',
        timestamp
      );

      // event status should remain unchanged
      const dbEvents = (await DatabaseActionMock.allEventRecords()).map(
        (event) => [event.id, event.status]
      );
      expect(dbEvents.length).toEqual(1);
      expect(dbEvents).to.deep.contain([eventId, EventStatus.reachedLimit]);

      // the request should NOT be added to database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(0);

      // `sendMessage` should NOT got called
      expect(sendMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('processReprocessResponse', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventReprocess.processReprocessResponse should update request
     * record in database
     * @dependencies
     * - database
     * @scenario
     * - insert two reprocess requests into db
     * - run test
     * - check database
     * @expected
     * - only request of given peer should be updated to accepted
     */
    it('should update request record in database', async () => {
      // insert two reprocess requests into db
      const requestId = '3d547d6f962c7356';
      const timestamp = TestConfigs.currentTimeStamp / 1000;
      const peers = ['peer0', 'peer1'];
      const eventId = 'event-id';
      for (const peerId of peers) {
        await DatabaseActionMock.insertReprocessRecord(
          requestId,
          eventId,
          'dialer-peer-id',
          peerId,
          ReprocessStatus.noResponse,
          timestamp
        );
      }

      // run test
      await EventReprocess.getInstance().processMessage(
        ReprocessMessageTypes.response,
        { requestId: requestId, ok: true },
        'signature',
        0,
        'peer0',
        timestamp
      );

      // check database
      const dbRequests = await DatabaseActionMock.allReprocessRecords();
      expect(dbRequests.length).toEqual(peers.length);
      expect(dbRequests[0]).toEqual({
        id: expect.any(Number),
        requestId: requestId,
        eventId: eventId,
        sender: 'dialer-peer-id',
        receiver: peers[0],
        status: ReprocessStatus.accepted,
        timestamp: TestConfigs.currentTimeStamp / 1000,
      });
      expect(dbRequests[1]).toEqual({
        id: expect.any(Number),
        requestId: requestId,
        eventId: eventId,
        sender: 'dialer-peer-id',
        receiver: peers[1],
        status: ReprocessStatus.noResponse,
        timestamp: TestConfigs.currentTimeStamp / 1000,
      });
    });
  });
});
