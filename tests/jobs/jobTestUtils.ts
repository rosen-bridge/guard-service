import { TransactionType } from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

import DatabaseHandlerMock from '../db/mocked/DatabaseAction.mock';
import * as EventTestData from '../event/testData';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import * as TxTestData from '../agreement/testData';
import Utils from '../../src/utils/Utils';
import TestUtils from '../testUtils/TestUtils';

/**
 * insert event reward transaction with all previous required entities
 * @param count
 */
const insertRewardTxWithTimestamps = async (count: number) => {
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
      TransactionType.reward,
      CARDANO_CHAIN,
      Utils.txIdToEventId(mockedEvent.sourceTxId)
    );
    await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.completed);
  }
};

export { insertRewardTxWithTimestamps };
