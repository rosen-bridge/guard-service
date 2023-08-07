import DatabaseHandlerMock from './mocked/DatabaseAction.mock';
import * as EventTestData from '../event/testData';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from './mocked/DatabaseAction.mock';
import * as TxTestData from '../agreement/testData';
import { EventTrigger, TransactionTypes } from '@rosen-chains/abstract-chain';
import Utils from '../../src/utils/Utils';
import TestUtils from '../testUtils/TestUtils';
import { DatabaseAction } from '../../src/db/DatabaseAction';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

/**
 * insert events with different heights to database
 * @param count number of inserted events
 * @param status event status
 */
const insertEventsWithHeight = async (
  count: number,
  status = EventStatus.completed
) => {
  for (let index = 0; index < count; index++) {
    const mockedEvent = EventTestData.mockEventTrigger();
    await DatabaseHandlerMock.insertEventRecord(
      mockedEvent,
      status,
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
 * @param status event status
 */
const insertEventsWithAmount = async (
  count: number,
  status = EventStatus.completed
) => {
  for (let index = 0; index < count; index++) {
    const mockedEvent = EventTestData.mockEventWithAmount(
      (1000 * index + 10000).toString()
    );
    await DatabaseHandlerMock.insertEventRecord(mockedEvent, status);
  }
};

/**
 * insert revenues with different timestamps to database
 * @param count number of inserted revenues
 * @param timeStep steps between stored timestamps (default is one week)
 */
const insertRevenueDataWithTimestamps = async (
  count: number,
  timeStep = 604800000
) => {
  for (let index = 0; index < count; index++) {
    const timestamp = 1664229200000 + timeStep * index;
    await insertRevenue(timestamp, 1000 + index);
  }
};

/**
 * insert revenues with different source and destination networks to database
 * @param count number of inserted revenues for each network
 * @param timeStep steps between stored timestamps (default is one week)
 */
const insertRevenueDataWithDifferentNetworks = async (
  count: number,
  timeStep = 604800000
) => {
  for (let index = 0; index < count; index++) {
    const timestamp = 1664229200000 + timeStep * index;
    const mockedEvent = EventTestData.mockFromErgoEventTrigger();
    await insertRevenue(timestamp, 2000 + index, mockedEvent);
    const mockedEvent2 = EventTestData.mockToErgoEventTrigger();
    await insertRevenue(timestamp, 3000 + index, mockedEvent2);
  }
};

/**
 * insert revenues with different timestamps to database
 * @param count number of inserted revenues for each token
 * @param timeStep steps between stored timestamps (default is one week)
 */
const insertRevenueDataWithDifferentTokenId = async (
  count: number,
  timeStep = 604800000
) => {
  for (let index = 0; index < count; index++) {
    const timestamp = 1664229200000 + timeStep * index;
    const mockedEvent = EventTestData.mockEventTrigger();
    await insertRevenue(timestamp, 1000 + index);
    await insertRevenue(timestamp, 2000 + index, mockedEvent, 'revenueToken');
  }
};

/**
 * inserts required entities for a valid revenue to database
 * - insert the mocked reference block with the timestamp
 * - insert mocked event within the block
 * - insert the reward transaction for the event
 * - insert the revenue for the reward transaction
 * @param timestamp block timestamp (revenue timestamp)
 * @param mockedEvent mocked event
 * @param height block height (revenue height)
 */
const insertRevenue = async (
  timestamp: number,
  height = 1000,
  mockedEvent: EventTrigger = EventTestData.mockEventTrigger(),
  revenueToken = 'tokenId'
) => {
  // insert block
  const blockId = TestUtils.generateRandomId();
  await DatabaseHandlerMock.insertBlockRecord(timestamp, blockId, height);

  // insert event
  await DatabaseHandlerMock.insertEventRecord(
    mockedEvent,
    EventStatus.completed,
    'box-serialized',
    20000,
    undefined,
    12000,
    13000,
    blockId
  );

  // insert reward transaction
  const tx = TxTestData.mockPaymentTransaction(
    TransactionTypes.reward,
    CARDANO_CHAIN,
    Utils.txIdToEventId(mockedEvent.sourceTxId)
  );
  await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.completed);
  const txRecord = await DatabaseAction.getInstance().getTxById(tx.txId);

  // insert revenue
  await DatabaseAction.getInstance().storeRevenue(
    revenueToken,
    10000n,
    txRecord
  );
};

export {
  insertEventsWithAmount,
  insertEventsWithHeight,
  insertRevenueDataWithTimestamps,
  insertRevenueDataWithDifferentNetworks,
  insertRevenueDataWithDifferentTokenId,
};
