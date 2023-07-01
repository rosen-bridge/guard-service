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

  /**
   * insert events with different heights to database
   * @param count number of inserted events
   */
  const insertEventsWithHeight = async (count: number) => {
    for (let index = 0; index < count; index++) {
      const mockedEvent = EventTestData.mockEventTrigger();
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.completed,
        'box_serialized',
        300,
        undefined,
        index + 1000
      );
    }
  };

  /**
   * insert events with different amounts to database
   * @param count number of inserted events
   */
  const insertEventsWithAmount = async (count: number) => {
    for (let index = 0; index < count; index++) {
      const mockedEvent = EventTestData.mockEventWithAmount(
        (1000 * index + 10000).toString()
      );
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.completed
      );
    }
  };

  describe('getCompletedEvents', () => {
    /**
     * @target DatabaseHandler.getCompletedEvents should return events in ascending order
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked events with various heights into db
     * - run test (call `getCompletedEvents`) with ascending sort
     * - check events
     * @expected
     * - should return 10 available events in ascending order
     * - events should be sorted from the first (in height 1000) to the last (in height 1009)
     */
    it('should return events in ascending order', async () => {
      await insertEventsWithHeight(10);
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
     * - insert 10 mocked events with various heights into db
     * - run test (call `getCompletedEvents`) with descending sort
     * - check events
     * @expected
     * - should return 10 available events in descending order
     * - events should be sorted from the last (in height 1009) to the first (in height 1000)
     */
    it('should return events in descending order', async () => {
      await insertEventsWithHeight(10);
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
     * - insert 10 to ergo events and 10 other mocked events into db
     * - run test (call `getCompletedEvents`) to filter "to ergo" events
     * - check events
     * @expected
     * - should return 10 events to ergo network
     */
    it('should return to ergo events', async () => {
      for (let index = 0; index < 10; index++) {
        // insert 10 mocked events into db
        const mockedEvent = EventTestData.mockEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
        // insert 10 mocked events to ergo network into db
        const mockedErgoEvent = EventTestData.mockToErgoEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedErgoEvent,
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
     * - insert 10 from ergo events and 10 other mocked events into db
     * - run test (call `getCompletedEvents`) to filter "from ergo" events
     * - check events
     * @expected
     * - should return 10 events from ergo network
     */
    it('should return from ergo events', async () => {
      for (let index = 0; index < 10; index++) {
        // insert 10 mocked events into db
        const mockedEvent = EventTestData.mockEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );

        // insert 10 mocked events from ergo network into db
        const mockedEvent2 = EventTestData.mockFromErgoEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent2,
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
     * - insert 10 mocked events with various amounts into db
     * - run test (call `getCompletedEvents`) to filter events with minimum amount
     * - check events
     * @expected
     * - should return 5 events with value more than or equal to 15000
     */
    it('should return events with at least minimum amount', async () => {
      await insertEventsWithAmount(10);
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
     * - insert 10 mocked events with various amounts into db
     * - run test (call `getCompletedEvents`) to filter events with maximum amount
     * - check events
     * @expected
     * - should return 6 events with value less than or equal to 15000
     */
    it('should return events with amount less than the maximum value', async () => {
      await insertEventsWithAmount(10);
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
