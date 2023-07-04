import DatabaseActionMock from './mocked/DatabaseAction.mock';
import * as EventTestData from '../event/testData';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { SortRequest } from '../../src/types/api';
import {
  EventStatus,
  RevenuePeriod,
  TransactionStatus,
} from '../../src/utils/constants';
import { DatabaseAction } from '../../src/db/DatabaseAction';
import {
  insertEventsWithAmount,
  insertEventsWithHeight,
  insertRevenueDataWithTimestamps,
} from './utils';
import * as TxTestData from '../agreement/testData';
import { TransactionTypes } from '@rosen-chains/abstract-chain';

describe('DatabaseActions', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  describe('getCompletedEvents', () => {
    /**
     * @target DatabaseAction.getCompletedEvents should return events in ascending order
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
      const events = await DatabaseAction.getInstance().getCompletedEvents(
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
     * @target DatabaseAction.getCompletedEvents should return events in descending order
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
      const events = await DatabaseAction.getInstance().getCompletedEvents(
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
     * @target DatabaseAction.getCompletedEvents should return to ergo events
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
        await DatabaseActionMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );
        // insert 10 mocked events to ergo network into db
        const mockedErgoEvent = EventTestData.mockToErgoEventTrigger();
        await DatabaseActionMock.insertEventRecord(
          mockedErgoEvent,
          EventStatus.completed
        );
      }

      const events = await DatabaseAction.getInstance().getCompletedEvents(
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
     * @target DatabaseAction.getCompletedEvents should return from ergo events
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
        await DatabaseActionMock.insertEventRecord(
          mockedEvent,
          EventStatus.completed
        );

        // insert 10 mocked events from ergo network into db
        const mockedEvent2 = EventTestData.mockFromErgoEventTrigger();
        await DatabaseActionMock.insertEventRecord(
          mockedEvent2,
          EventStatus.completed
        );
      }

      const events = await DatabaseAction.getInstance().getCompletedEvents(
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
     * @target DatabaseAction.getCompletedEvents should return events with at least minimum amount
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
      const events = await DatabaseAction.getInstance().getCompletedEvents(
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
     * @target DatabaseAction.getCompletedEvents should return events with amount less than the maximum value
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
      const events = await DatabaseAction.getInstance().getCompletedEvents(
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

  describe('getUnsavedRevenueIds', () => {
    /**
     * @target DatabaseAction.getUnsavedRevenueIds should return unsaved revenue ids for completed reward txs
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked reward and 10 mocked payment txs in database
     * - run test (call `getUnsavedRevenueIds`)
     * - check unsaved revenue tx ids
     * @expected
     * - should return 10 unsaved revenue ids
     * - all returned ids should be reward tx ids
     */
    it('should return unsaved revenue ids for completed reward txs', async () => {
      const rewardTxIds = [];
      for (let index = 0; index < 10; index++) {
        // insert 10 reward tx to database
        const rewardTx = TxTestData.mockPaymentTransaction(
          TransactionTypes.reward
        );
        await DatabaseActionMock.insertTxRecord(
          rewardTx,
          TransactionStatus.completed
        );
        rewardTxIds.push(rewardTx.txId);

        // insert 10 payment tx to database
        const paymentTx = TxTestData.mockPaymentTransaction(
          TransactionTypes.payment
        );
        await DatabaseActionMock.insertTxRecord(
          paymentTx,
          TransactionStatus.completed
        );
      }

      const unsavedRevenues =
        await DatabaseAction.getInstance().getUnsavedRevenueIds();
      expect(unsavedRevenues.length).toEqual(10);
      expect(rewardTxIds.sort()).toEqual(unsavedRevenues.sort());
    });
  });

  describe('getTxsById', () => {
    /**
     * @target DatabaseAction.getCompletedEvents should return requested txs
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked reward and 10 mocked payment txs in database
     * - run test (call `getTxsById`)
     * - check returned txs
     * @expected
     * - should return 10 txs with requested ids
     */
    it('should return requested txs', async () => {
      const txIds = [];
      for (let index = 0; index < 10; index++) {
        // insert 10 reward tx to database
        const tx = TxTestData.mockPaymentTransaction(TransactionTypes.reward);
        await DatabaseActionMock.insertTxRecord(
          tx,
          TransactionStatus.completed
        );
        txIds.push(tx.txId);
      }

      const txs = await DatabaseAction.getInstance().getTxsById(txIds);
      expect(txs.length).toEqual(10);
      expect(txs.map((tx) => tx.txId).sort()).toEqual(txIds.sort());
    });
  });

  describe('storeRevenue', () => {
    /**
     * @target DatabaseAction.storeRevenue should store new revenue correctly
     * - database
     * @scenario
     * - insert a mocked tx to db
     * - get the saved tx entity
     * - run test (call `storeRevenue`)
     * - check saved revenue
     * @expected
     * - should store the new revenue correctly
     */
    it('should store the new revenue correctly', async () => {
      const tx = TxTestData.mockPaymentTransaction(TransactionTypes.reward);
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.completed);
      const txRecord = await DatabaseAction.getInstance().getTxById(tx.txId);
      const savedRevenue = await DatabaseAction.getInstance().storeRevenue(
        'tokenId',
        '1000',
        txRecord
      );

      expect(savedRevenue.tokenId).toEqual('tokenId');
      expect(savedRevenue.amount).toEqual('1000');
      expect(savedRevenue.tx.txId).toEqual(tx.txId);
    });
  });

  describe('getRevenuesWithFilters', () => {
    /**
     * @target DatabaseAction.getRevenuesWithFilters should return all stored revenues in descending order
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return all stored revenues
     * - the revenues timestamps should be descending
     */
    it('should return all stored revenues in descending order', async () => {
      await insertRevenueDataWithTimestamps(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters();
      expect(revenues).toHaveLength(10);
      for (let index = 0; index < 9; index++) {
        expect(revenues[index].timestamp).toBeGreaterThanOrEqual(
          revenues[index + 1].timestamp
        );
      }
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return all stored revenues in ascending order
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return all stored revenues
     * - the revenues timestamps should be ascending
     */
    it('should return all stored revenues in ascending order', async () => {
      await insertRevenueDataWithTimestamps(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          SortRequest.ASC
        );
      expect(revenues).toHaveLength(10);
      for (let index = 0; index < 9; index++) {
        expect(revenues[index].timestamp).toBeLessThanOrEqual(
          revenues[index + 1].timestamp
        );
      }
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return the specified revenue
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return the specified revenue
     */
    it('should return the specified revenue', async () => {
      await insertRevenueDataWithTimestamps(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          'fromChain',
          'toChain',
          'tokenId',
          1002,
          1003,
          1664829100000,
          1664829300000
        );
      expect(revenues).toHaveLength(1);
    });
  });

  describe('getRevenueChartData', () => {
    /**
     * @target DatabaseAction.getRevenueChartData should return yearly revenue report
     * - database
     * @scenario
     * - insert 30 mocked revenues with different timestamps
     * - run test (call `getRevenueChartData`)
     * - check revenue report
     * @expected
     * - should return 2 years revenue report
     */
    it('should return yearly revenue report', async () => {
      await insertRevenueDataWithTimestamps(30);

      const revenueChart =
        await DatabaseAction.getInstance().getRevenueChartData(
          RevenuePeriod.year
        );
      expect(revenueChart).toHaveLength(2);
    });

    /**
     * @target DatabaseAction.getRevenueChartData should return monthly revenue report
     * - database
     * @scenario
     * - insert 20 mocked revenues with different timestamps
     * - run test (call `getRevenueChartData`)
     * - check revenue report
     * @expected
     * - should return 4 months revenue report
     */
    it('should return monthly revenue report', async () => {
      await insertRevenueDataWithTimestamps(20);

      const revenueChart =
        await DatabaseAction.getInstance().getRevenueChartData(
          RevenuePeriod.month
        );
      expect(revenueChart).toHaveLength(4);
    });

    /**
     * @target DatabaseAction.getRevenueChartData should return weekly revenue report
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenueChartData`)
     * - check revenue report
     * @expected
     * - should return 6 weeks revenue report
     */
    it('should return weekly revenue report', async () => {
      await insertRevenueDataWithTimestamps(10);

      const revenueChart =
        await DatabaseAction.getInstance().getRevenueChartData(
          RevenuePeriod.weak
        );
      expect(revenueChart).toHaveLength(6);
    });
  });
});
