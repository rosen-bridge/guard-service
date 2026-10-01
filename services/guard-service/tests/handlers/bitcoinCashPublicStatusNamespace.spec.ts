import { TransactionType } from '@rosen-chains/abstract-chain';

import EventSerializer from '../../src/event/eventSerializer';
import { UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import { mockPaymentTransaction } from '../agreement/testData';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from '../db/bitcoinCashNamespaceFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import TestPublicStatusHandler from './testPublicStatusHandler';

describe('BCH public status request identity', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());
  afterEach(() => vi.restoreAllMocks());

  it.each(['event', 'transaction'])(
    'looks up by guard identity and emits wire identity for a BCH %s status',
    async (kind) => {
      await insertNamespaceEvent(
        namespaceEvent('bitcoin'),
        'btc-trigger',
        EventStatus.inPayment,
      );
      const bch = await insertNamespaceEvent(
        namespaceEvent(),
        'bch-trigger',
        EventStatus.inPayment,
      );
      const tx = mockPaymentTransaction(
        TransactionType.payment,
        'ergo',
        EventSerializer.getId(bch),
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);
      const handler = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );
      const submit = vi
        .spyOn(
          handler.processor as unknown as {
            jobFn(dto: UpdateStatusDTO): Promise<void>;
          },
          'jobFn',
        )
        .mockResolvedValue(undefined);
      if (kind === 'event')
        await handler.updatePublicEventStatus(
          EventSerializer.getId(bch),
          EventStatus.inPayment,
        );
      else
        await handler.updatePublicTxStatus(tx.txId, TransactionStatus.approved);
      expect(submit).toHaveBeenCalledExactlyOnceWith({
        eventId: bch.eventId,
        triggerTxId: bch.txId,
        status: EventStatus.inPayment,
        tx: {
          txId: tx.txId,
          chain: 'ergo',
          txType: TransactionType.payment,
          txStatus: TransactionStatus.approved,
        },
      });
    },
  );
});
