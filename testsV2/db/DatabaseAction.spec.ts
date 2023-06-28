import DatabaseHandlerMock from './mocked/DatabaseAction.mock';
import * as EventTestData from '../event/testData';
import { EventStatus } from '../../src/models/Models';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { SortRequest } from '../../src/types/api';
import { dbAction } from '../../src/db/DatabaseAction';

describe('DatabaseActions', () => {
  beforeEach(async () => {
    await DatabaseHandlerMock.clearTables();
  });

  describe('getCompletedEvents', () => {
    /**
     * @target DatabaseHandler.getCompletedEvents should return events in ascending order
     * @dependencies
     * - database
     * @scenario
     * - mock 100 events
     * - insert mocked events into db
     * - run test (call `getCompletedEvents`)
     * - check events
     * @expected
     * - should return 10 available events in ascending order
     */
    it('Should return events in ascending order', async () => {
      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockEventTrigger();
        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed,
          'box_serialized',
          300,
          undefined,
          index + 1000
        );
      }

      const events = await dbAction.getCompletedEvents(
        SortRequest.ASC,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(events).toHaveLength(10);
      for (let index = 0; index < 10; index++) {
        expect(events[index].eventData.height).toEqual(1000 + index);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return events in descending order
     * @dependencies
     * - database
     * @scenario
     * - mock 100 events
     * - insert mocked events into db
     * - run test (call `getCompletedEvents`)
     * - check events
     * @expected
     * - should return 10 available events in descending order
     */
    it('Should return events in descending order', async () => {
      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockEventTrigger();
        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed,
          'box_serialized',
          300,
          undefined,
          index + 1000
        );
      }

      const events = await dbAction.getCompletedEvents(
        SortRequest.DESC,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(events).toHaveLength(10);
      for (let index = 0; index < 10; index++) {
        expect(events[index].eventData.height).toEqual(1009 - index);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return to ergo events
     * @dependencies
     * - database
     * @scenario
     * - mock 10 to ergo events and 10 other events
     * - insert mocked events into db
     * - run test (call `getCompletedEvents`)
     * - check events
     * @expected
     * - should return 20 events with correct ids
     */
    it('Should return to ergo events', async () => {
      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockEventTrigger();

        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
      }

      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockToErgoEventTrigger();

        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
      }

      const events = await dbAction.getCompletedEvents(
        undefined,
        undefined,
        ERGO_CHAIN,
        undefined,
        undefined
      );
      expect(events).toHaveLength(10);
      for (const event of events) {
        expect(event.eventData.toChain).toEqual(ERGO_CHAIN);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return from ergo events
     * @dependencies
     * - database
     * @scenario
     * - mock 10 from ergo events and 10 other events
     * - insert mocked events into db
     * - run test (call `getCompletedEvents`)
     * - check events
     * @expected
     * - should return 20 events with correct ids
     */
    it('Should return from ergo events', async () => {
      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockEventTrigger();

        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
      }

      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockFromErgoEventTrigger();

        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
      }

      const events = await dbAction.getCompletedEvents(
        undefined,
        ERGO_CHAIN,
        undefined,
        undefined,
        undefined
      );
      expect(events).toHaveLength(10);
      for (const event of events) {
        expect(event.eventData.fromChain).toEqual(ERGO_CHAIN);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return events with at least minimum amount
     * @dependencies
     * - database
     * @scenario
     * - mock 100 events
     * - insert mocked events into db
     * - run test (call `getCompletedEvents`)
     * - check events
     * @expected
     * - should return 20 events with correct ids
     */
    it('should return events with at least minimum amount', async () => {
      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockEventWithAmount(
          (1000 * index + 10000).toString()
        );

        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
      }

      const events = await dbAction.getCompletedEvents(
        undefined,
        undefined,
        undefined,
        '15000',
        undefined
      );
      expect(events).toHaveLength(5);
      for (const event of events) {
        expect(BigInt(event.eventData.amount)).toBeGreaterThanOrEqual(15000n);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return events with amount less than the maximum value
     * @dependencies
     * - database
     * @scenario
     * - mock 100 events
     * - insert mocked events into db
     * - run test (call `getCompletedEvents`)
     * - check events
     * @expected
     * - should return 20 events with correct ids
     */
    it('should return events with amount less than the maximum value', async () => {
      for (let index = 0; index < 10; index++) {
        // mock event
        const mockedEvent = EventTestData.mockEventWithAmount(
          (1000 * index + 10000).toString()
        );

        // insert mocked event into db
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
      }

      const events = await dbAction.getCompletedEvents(
        undefined,
        undefined,
        undefined,
        undefined,
        '15000'
      );
      expect(events).toHaveLength(6);
      for (const event of events) {
        expect(BigInt(event.eventData.amount)).toBeLessThanOrEqual(15000n);
      }
    });
  });
});
