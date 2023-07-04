import DatabaseHandlerMock from './mocked/DatabaseAction.mock';
import * as EventTestData from '../event/testData';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from './mocked/DatabaseAction.mock';
import * as TxTestData from '../agreement/testData';
import { TransactionTypes } from '@rosen-chains/abstract-chain';
import Utils from '../../src/utils/Utils';
import TestUtils from '../testUtils/TestUtils';
import { DatabaseAction } from '../../src/db/DatabaseAction';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

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

const insertRevenueDataWithTimestamps = async (count: number) => {
  for (let index = 0; index < count; index++) {
    // insert block
    const timestamp = 1664229200000 + 300000000 * index;
    const blockId = TestUtils.generateRandomId();
    await DatabaseHandlerMock.insertBlockRecord(
      timestamp,
      blockId,
      1000 + index
    );

    // insert event
    const mockedEvent = EventTestData.mockEventTrigger();
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
      'tokenId',
      '10000',
      txRecord
    );
  }
};

export {
  insertEventsWithAmount,
  insertEventsWithHeight,
  insertRevenueDataWithTimestamps,
};
