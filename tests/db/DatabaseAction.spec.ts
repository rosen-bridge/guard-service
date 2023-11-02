import DatabaseActionMock from './mocked/DatabaseAction.mock';
import DatabaseHandlerMock from './mocked/DatabaseAction.mock';
import * as EventTestData from '../event/testData';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { SortRequest } from '../../src/types/api';
import {
  EventStatus,
  RevenuePeriod,
  RevenueType,
  TransactionStatus,
} from '../../src/utils/constants';
import { DatabaseAction } from '../../src/db/DatabaseAction';
import {
  insertEventsWithAmount,
  insertEventsWithHeight,
  insertRevenueDataWithDifferentNetworks,
  insertRevenueDataWithDifferentTokenId,
  insertRevenueDataWithTimestamps,
} from './databaseTestUtils';
import * as TxTestData from '../agreement/testData';
import { TransactionType } from '@rosen-chains/abstract-chain';
import TestConfigs from '../testUtils/TestConfigs';
import TestUtils from '../testUtils/TestUtils';

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
      expect(events.total).toEqual(10);
      for (let index = 0; index < 10; index++) {
        expect(events.items[index].eventData.height).toEqual(1000 + index);
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
      expect(events.total).toEqual(10);
      for (let index = 0; index < 10; index++) {
        expect(events.items[index].eventData.height).toEqual(1009 - index);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return events that are transferring assets to ergo network
     * @dependencies
     * - database
     * @scenario
     * - insert 10 "to ergo" events and 10 other mocked events into db
     * - run test (call `getCompletedEvents`) to filter "to ergo" events
     * - check events
     * @expected
     * - should return 10 events "to ergo" network
     */
    it('should return events that are transferring assets to ergo network', async () => {
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
      expect(events.total).toEqual(10);
      for (const event of events.items) {
        expect(event.eventData.toChain).toEqual(ERGO_CHAIN);
      }
    });

    /**
     * @target DatabaseHandler.getCompletedEvents should return events that are transferring assets from ergo network
     * @dependencies
     * - database
     * @scenario
     * - insert 10 "from ergo" events and 10 other mocked events into db
     * - run test (call `getCompletedEvents`) to filter "from ergo" events
     * - check events
     * @expected
     * - should return 10 events "from ergo" network
     */
    it('should return events that are transferring assets from ergo network', async () => {
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
      expect(events.total).toEqual(10);
      for (const event of events.items) {
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
      expect(events.total).toEqual(5);
      for (const event of events.items) {
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
      expect(events.total).toEqual(6);
      for (const event of events.items) {
        expect(BigInt(event.eventData.amount)).toBeLessThanOrEqual(15000n);
      }
    });
  });

  describe('getUnsavedRevenueEvents', () => {
    /**
     * @target DatabaseAction.getUnsavedRevenueEvents should return
     * unsaved revenue events containing spendTx
     * @dependencies
     * - database
     * @scenario
     * - insert 3 events
     *   - one without spendTxId
     *   - one with spendTxId but without revenue
     *   - one with spendTxId and revenue
     * - run test
     * - check returned value
     * @expected
     * - should return only the second event which is
     *   event with spendTxId but without revenue
     */
    it('should return unsaved revenue events containing spendTx', async () => {
      // insert 3 events
      const boxSerialized = 'boxSerialized';
      //  one without spendTxId
      const mockedEvent1 = EventTestData.mockEventTrigger();
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent1,
        boxSerialized
      );
      //  one with spendTxId but without revenue
      const mockedEvent2 = EventTestData.mockEventTrigger();
      const spendTxId2 = TestUtils.generateRandomId();
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent2,
        boxSerialized,
        100,
        spendTxId2,
        TestUtils.generateRandomId()
      );
      //  one with spendTxId and revenue
      const mockedEvent3 = EventTestData.mockEventTrigger();
      const spendTxId3 = TestUtils.generateRandomId();
      await DatabaseActionMock.insertOnlyEventDataRecord(
        mockedEvent3,
        boxSerialized,
        100,
        spendTxId3,
        TestUtils.generateRandomId()
      );
      const mockedEvent3Entity = (
        await DatabaseActionMock.allRawEventRecords()
      ).find((event) => event.spendTxId === spendTxId3)!;
      await DatabaseAction.getInstance().insertRevenue(
        TestUtils.generateRandomId(),
        100n,
        spendTxId3,
        RevenueType.fraud,
        mockedEvent3Entity
      );

      // run test
      const result =
        await DatabaseAction.getInstance().getConfirmedUnsavedRevenueEvents(
          115,
          10
        );

      // check returned value
      expect(result.length).toEqual(1);
      expect(result[0].spendTxId).toEqual(spendTxId2);
    });
  });

  describe('getTxsById', () => {
    /**
     * @target DatabaseAction.getTxsById should return requested txs
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked reward and 10 mocked payment txs in database
     * - run test (call `getTxsById`)
     * - check returned txs
     * @expected
     * - should return 5 selected txs with requested ids
     */
    it('should return requested txs', async () => {
      const txIds = [];
      for (let index = 0; index < 10; index++) {
        // insert 10 reward tx to database
        const tx = TxTestData.mockPaymentTransaction(TransactionType.reward);
        await DatabaseActionMock.insertTxRecord(
          tx,
          TransactionStatus.completed
        );
        txIds.push(tx.txId);
      }

      const requiredTxs = txIds.slice(0, 5);
      const txs = await DatabaseAction.getInstance().getTxsById(requiredTxs);
      expect(txs.length).toEqual(5);
      expect(txs.map((tx) => tx.txId).sort()).toEqual(requiredTxs.sort());
    });
  });

  describe('getOngoingEvents', () => {
    /**
     * @target DatabaseHandler.getOngoingEvents should return events in ascending order
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked events with various heights into db
     * - run test (call `getOngoingEvents`) with ascending sort
     * - check events
     * @expected
     * - should return 10 available ongoing events in ascending order
     * - should filter out completed events
     * - events should be sorted from the first (in height 1000) to the last (in height 1009)
     */
    it('should return events in ascending order', async () => {
      await insertEventsWithHeight(10, EventStatus.inPayment);
      await insertEventsWithHeight(10);
      const events = await DatabaseAction.getInstance().getOngoingEvents(
        SortRequest.ASC,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(events.total).toEqual(10);
      for (let index = 0; index < 10; index++) {
        expect(events.items[index].eventData.height).toEqual(1000 + index);
      }
    });

    /*
     * @target DatabaseHandler.getOngoingEvents should return events that are transferring assets to ergo network
     * @dependencies
     * - database
     * @scenario
     * - insert 10 "to ergo" events and 10 other mocked events into db
     * - run test (call `getOngoingEvents`) to filter "to ergo" events
     * - check events
     * @expected
     * - should return 10 events "to ergo" network
     */
    it('should return events that are transferring assets to ergo network', async () => {
      for (let index = 0; index < 10; index++) {
        // insert 10 mocked events into db
        const mockedEvent = EventTestData.mockEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.pendingPayment
        );
        // insert 10 mocked events to ergo network into db
        const mockedErgoEvent = EventTestData.mockToErgoEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedErgoEvent,
          EventStatus.pendingPayment
        );
      }

      const events = await DatabaseAction.getInstance().getOngoingEvents(
        undefined,
        undefined,
        ERGO_CHAIN,
        undefined,
        undefined
      );
      expect(events.total).toEqual(10);
      for (const event of events.items) {
        expect(event.eventData.toChain).toEqual(ERGO_CHAIN);
      }
    });

    /**
     * @target DatabaseHandler.getOngoingEvents should return events that are transferring assets from ergo network
     * @dependencies
     * - database
     * @scenario
     * - insert 10 "from ergo" events and 10 other mocked events into db
     * - run test (call `getOngoingEvents`) to filter "from ergo" events
     * - check events
     * @expected
     * - should return 10 events "from ergo" network
     */
    it('should return events that are transferring assets from ergo network', async () => {
      for (let index = 0; index < 10; index++) {
        // insert 10 mocked events into db
        const mockedEvent = EventTestData.mockEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent,
          EventStatus.pendingReward
        );

        // insert 10 mocked events from ergo network into db
        const mockedEvent2 = EventTestData.mockFromErgoEventTrigger();
        await DatabaseHandlerMock.insertEventRecord(
          mockedEvent2,
          EventStatus.pendingReward
        );
      }

      const events = await DatabaseAction.getInstance().getOngoingEvents(
        undefined,
        ERGO_CHAIN,
        undefined,
        undefined,
        undefined
      );
      expect(events.total).toEqual(10);
      for (const event of events.items) {
        expect(event.eventData.fromChain).toEqual(ERGO_CHAIN);
      }
    });

    /**
     * @target DatabaseHandler.getOngoingEvents should return events with at least minimum amount
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked events with various amounts into db
     * - run test (call `getOngoingEvents`) to filter events with minimum amount
     * - check events
     * @expected
     * - should return 5 events with value more than or equal to 15000
     */
    it('should return events with at least minimum amount', async () => {
      await insertEventsWithAmount(10, EventStatus.rewardWaiting);
      const events = await DatabaseAction.getInstance().getOngoingEvents(
        undefined,
        undefined,
        undefined,
        '15000',
        undefined
      );
      expect(events.total).toEqual(5);
      for (const event of events.items) {
        expect(BigInt(event.eventData.amount)).toBeGreaterThanOrEqual(15000n);
      }
    });

    /**
     * @target DatabaseHandler.getOngoingEvents should return events with amount less than the maximum value
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked events with various amounts into db
     * - run test (call `getOngoingEvents`) to filter events with maximum amount
     * - check events
     * @expected
     * - should return 6 events with value less than or equal to 15000
     */
    it('should return events with amount less than the maximum value', async () => {
      await insertEventsWithAmount(10, EventStatus.inPayment);
      const events = await DatabaseAction.getInstance().getOngoingEvents(
        undefined,
        undefined,
        undefined,
        undefined,
        '15000'
      );
      expect(events.total).toEqual(6);
      for (const event of events.items) {
        expect(BigInt(event.eventData.amount)).toBeLessThanOrEqual(15000n);
      }
    });

    /*     * @target DatabaseHandler.getOngoingEvents should return events in descending order
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked events with various heights into db
     * - run test (call `getOngoingEvents`) with descending sort
     * - check events
     * @expected
     * - should return 10 available events in descending order
     * - events should be sorted from the last (in height 1009) to the first (in height 1000)
     */
    it('should return events in descending order', async () => {
      await insertEventsWithHeight(10, EventStatus.inReward);
      const events = await DatabaseAction.getInstance().getOngoingEvents(
        SortRequest.DESC,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(events.total).toEqual(10);
      for (let index = 0; index < 10; index++) {
        expect(events.items[index].eventData.height).toEqual(1009 - index);
      }
    });
  });

  describe('getRevenuesWithFilters', () => {
    /**
     * @target DatabaseAction.getRevenuesWithFilters should return all stored revenues in descending order
     * @dependencies
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
      expect(revenues.total).toEqual(10);
      for (let index = 0; index < 9; index++) {
        expect(revenues.items[index].timestamp).toBeGreaterThanOrEqual(
          revenues.items[index + 1].timestamp
        );
      }
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return all stored revenues in ascending order
     * @dependencies
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
      expect(revenues.total).toEqual(10);
      for (let index = 0; index < 9; index++) {
        expect(revenues.items[index].timestamp).toBeLessThanOrEqual(
          revenues.items[index + 1].timestamp
        );
      }
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return the revenue with specified height
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked revenues with different heights
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return the specified revenue
     */
    it('should return the revenue with specified height', async () => {
      await insertRevenueDataWithTimestamps(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          undefined,
          undefined,
          1002,
          1003
        );
      expect(revenues.total).toEqual(1);
      expect(revenues.items[0].height).toBeGreaterThanOrEqual(1002);
      expect(revenues.items[0].height).toBeLessThan(1003);
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return the revenue with specified timestamp
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return the specified revenue
     */
    it('should return the revenue with specified timestamp', async () => {
      await insertRevenueDataWithTimestamps(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1665438000000,
          1665439000000
        );
      expect(revenues.total).toEqual(1);
      expect(revenues.items[0].timestamp).toBeGreaterThanOrEqual(1665438000000);
      expect(revenues.items[0].timestamp).toBeLessThanOrEqual(1665439000000);
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return the revenue for events that are transferring assets from ergo network
     * @dependencies
     * - database
     * @scenario
     * - insert 20 mocked revenues with different networks (10 "from ergo", 10 others)
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return 10 "from ergo" event revenues
     */
    it('should return the revenue for events that are transferring assets from ergo network', async () => {
      await insertRevenueDataWithDifferentNetworks(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          ERGO_CHAIN
        );
      expect(revenues.total).toEqual(10);
      revenues.items.forEach((revenue) =>
        expect(revenue.fromChain).toEqual(ERGO_CHAIN)
      );
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return the revenue for events that are transferring assets to ergo network
     * @dependencies
     * - database
     * @scenario
     * - insert 20 mocked revenues with different networks (10 "to ergo", 10 others)
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return 10 "to ergo" event revenues
     */
    it('should return the revenue for events that are transferring assets to ergo network', async () => {
      await insertRevenueDataWithDifferentNetworks(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          undefined,
          ERGO_CHAIN
        );
      expect(revenues.total).toEqual(10);
      revenues.items.forEach((revenue) =>
        expect(revenue.toChain).toEqual(ERGO_CHAIN)
      );
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should consider pagination
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return limited data with correct total value
     */
    it('should consider pagination', async () => {
      await insertRevenueDataWithTimestamps(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          1,
          3
        );
      expect(revenues.items).toHaveLength(3);
      expect(revenues.total).toEqual(10);
    });
  });

  describe('getRevenueChartData', () => {
    /**
     * @target DatabaseAction.getRevenueChartData should return yearly revenue report
     * @dependencies
     * - database
     * @scenario
     * - insert 30 mocked revenues with different timestamps
     * - run test (call `getRevenueChartData`)
     * - check revenue report
     * @expected
     * - should return 2 years revenue report
     */
    it('should return yearly revenue report', async () => {
      await insertRevenueDataWithTimestamps(5, 31539600000);

      const revenueChart =
        await DatabaseAction.getInstance().getRevenueChartData(
          RevenuePeriod.year
        );
      expect(revenueChart).toHaveLength(5);
      for (const revenue of revenueChart) {
        expect(revenue.amount).toEqual(10000);
      }
    });

    /**
     * @target DatabaseAction.getRevenueChartData should return monthly revenue report
     * @dependencies
     * - database
     * @scenario
     * - insert 20 mocked revenues with different timestamps
     * - run test (call `getRevenueChartData`)
     * - check revenue report
     * @expected
     * - should return 4 months revenue report
     */
    it('should return monthly revenue report', async () => {
      await insertRevenueDataWithTimestamps(5, 2592000000);

      const revenueChart =
        await DatabaseAction.getInstance().getRevenueChartData(
          RevenuePeriod.month
        );
      expect(revenueChart).toHaveLength(5);
      for (const revenue of revenueChart) {
        expect(revenue.amount).toEqual(10000);
      }
    });

    /**
     * @target DatabaseAction.getRevenueChartData should return weekly revenue report
     * @dependencies
     * - database
     * @scenario
     * - insert 10 mocked revenues with different timestamps
     * - run test (call `getRevenueChartData`)
     * - check revenue report
     * @expected
     * - should return 6 weeks revenue report
     */
    it('should return weekly revenue report', async () => {
      await insertRevenueDataWithTimestamps(5);

      const revenueChart =
        await DatabaseAction.getInstance().getRevenueChartData(
          RevenuePeriod.week
        );
      expect(revenueChart).toHaveLength(5);
      for (const revenue of revenueChart) {
        expect(revenue.amount).toEqual(10000);
      }
    });
  });

  describe('setTxAsSignFailed', () => {
    const currentTimeStampSeconds = Math.round(
      TestConfigs.currentTimeStamp / 1000
    );

    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    /**
     * @target DatabaseAction.setTxAsSignFailed should set tx as sign-failed successfully
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock transaction and insert into db as 'in-sign'
     * - run test
     * - check tx
     * @expected
     * - status should be updated to 'sign-failed'
     * - signFailedCount should be incremented
     * - failedInSign should be updated to true
     */
    it('should set tx as sign-failed successfully', async () => {
      // mock transaction and insert into db as 'in-sign'
      const tx = TxTestData.mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.inSign);

      // run test
      await DatabaseAction.getInstance().setTxAsSignFailed(tx.txId);

      // signFailedCount should remain unchanged
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.status,
        tx.lastStatusUpdate,
        tx.failedInSign,
        tx.signFailedCount,
      ]);
      expect(dbTxs).toEqual([
        [
          tx.txId,
          TransactionStatus.signFailed,
          currentTimeStampSeconds.toString(),
          true,
          1,
        ],
      ]);
    });

    /**
     * @target DatabaseAction.setTxAsSignFailed should not increment counter
     * when tx status is already sign-failed
     * @dependencies
     * - database
     * @scenario
     * - mock transaction and insert into db as 'sign-failed'
     * - run test
     * - check tx
     * @expected
     * - signFailedCount should remain unchanged
     */
    it('should not increment counter when tx status is already sign-failed', async () => {
      // mock transaction and insert into db as 'in-sign'
      const tx = TxTestData.mockPaymentTransaction();
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.signFailed);

      // run test
      await DatabaseAction.getInstance().setTxAsSignFailed(tx.txId);

      // signFailedCount should remain unchanged
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.signFailedCount,
      ]);
      expect(dbTxs).toEqual([[tx.txId, 0]]);
    });
  });
});
