import DatabaseActionMock from './mocked/DatabaseAction.mock';
import DatabaseHandlerMock from './mocked/DatabaseAction.mock';
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
  insertRevenueDataWithDifferentNetworks,
  insertRevenueDataWithDifferentTokenId,
  insertRevenueDataWithTimestamps,
} from './databaseTestUtils';
import * as TxTestData from '../agreement/testData';
import { TransactionType } from '@rosen-chains/abstract-chain';
import TestConfigs from '../testUtils/TestConfigs';

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
      expect(events).toHaveLength(10);
      for (const event of events) {
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
     * - insert 10 mocked completed reward txs
     * - insert 10 mocked in-sign reward txs
     * - insert 10 mocked completed payment txs in database
     * - run test (call `getUnsavedRevenueIds`)
     * - check unsaved revenue tx ids
     * @expected
     * - should return 10 completed unsaved revenue ids
     * - all returned ids should be reward tx ids
     */
    it('should return unsaved revenue ids for completed reward txs', async () => {
      const rewardTxIds = [];
      for (let index = 0; index < 10; index++) {
        // insert 10 completed reward tx to database
        const rewardTx = TxTestData.mockPaymentTransaction(
          TransactionType.reward
        );
        await DatabaseActionMock.insertTxRecord(
          rewardTx,
          TransactionStatus.completed
        );
        rewardTxIds.push(rewardTx.txId);

        // insert 10 in-sign reward tx to database
        const waitingRewardTx = TxTestData.mockPaymentTransaction(
          TransactionType.reward
        );
        await DatabaseActionMock.insertTxRecord(
          waitingRewardTx,
          TransactionStatus.inSign
        );

        // insert 10 payment tx to database
        const paymentTx = TxTestData.mockPaymentTransaction(
          TransactionType.payment
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
      expect(events).toHaveLength(10);
      for (let index = 0; index < 10; index++) {
        expect(events[index].eventData.height).toEqual(1000 + index);
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
      expect(events).toHaveLength(10);
      for (const event of events) {
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
      expect(events).toHaveLength(10);
      for (const event of events) {
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
      expect(events).toHaveLength(5);
      for (const event of events) {
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
      expect(events).toHaveLength(6);
      for (const event of events) {
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
      expect(events).toHaveLength(10);
      for (let index = 0; index < 10; index++) {
        expect(events[index].eventData.height).toEqual(1009 - index);
      }
    });
  });

  describe('storeRevenue', () => {
    /**
     * @target DatabaseAction.storeRevenue should store new revenue correctly
     * @dependencies
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
      const tx = TxTestData.mockPaymentTransaction(TransactionType.reward);
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.completed);
      const txRecord = (await DatabaseAction.getInstance().getTxById(tx.txId))!;
      await DatabaseAction.getInstance().storeRevenue(
        'tokenId',
        1000n,
        txRecord
      );
      const savedRevenue = await DatabaseActionMock.allRevenueRecords();
      expect(savedRevenue).toHaveLength(1);
      expect(savedRevenue[0].tokenId).toEqual('tokenId');
      expect(savedRevenue[0].amount).toEqual(1000n);
      expect(savedRevenue[0].tx.txId).toEqual(tx.txId);
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
      expect(revenues).toHaveLength(10);
      for (let index = 0; index < 9; index++) {
        expect(revenues[index].timestamp).toBeGreaterThanOrEqual(
          revenues[index + 1].timestamp
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
      expect(revenues).toHaveLength(10);
      for (let index = 0; index < 9; index++) {
        expect(revenues[index].timestamp).toBeLessThanOrEqual(
          revenues[index + 1].timestamp
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
          undefined,
          1002,
          1003
        );
      expect(revenues).toHaveLength(1);
      expect(revenues[0].height).toBeGreaterThanOrEqual(1002);
      expect(revenues[0].height).toBeLessThan(1003);
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
          undefined,
          1665438000000,
          1665439000000
        );
      expect(revenues).toHaveLength(1);
      expect(revenues[0].timestamp).toBeGreaterThanOrEqual(1665438000000);
      expect(revenues[0].timestamp).toBeLessThanOrEqual(1665439000000);
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
      expect(revenues).toHaveLength(10);
      revenues.forEach((revenue) =>
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
      expect(revenues).toHaveLength(10);
      revenues.forEach((revenue) =>
        expect(revenue.toChain).toEqual(ERGO_CHAIN)
      );
    });

    /**
     * @target DatabaseAction.getRevenuesWithFilters should return the revenue with specified revenue token
     * @dependencies
     * - database
     * @scenario
     * - insert 20 mocked revenues with different tokenIds (10 "revenueToken", 10 others)
     * - run test (call `getRevenuesWithFilters`)
     * - check returned revenues
     * @expected
     * - should return 10 revenues with specified token
     */
    it('should return the revenue with specified revenue token', async () => {
      await insertRevenueDataWithDifferentTokenId(10);
      const revenues =
        await DatabaseAction.getInstance().getRevenuesWithFilters(
          undefined,
          undefined,
          undefined,
          'revenueToken'
        );
      expect(revenues).toHaveLength(10);
      revenues.forEach((revenue) =>
        expect(revenue.revenueTokenId).toEqual('revenueToken')
      );
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
