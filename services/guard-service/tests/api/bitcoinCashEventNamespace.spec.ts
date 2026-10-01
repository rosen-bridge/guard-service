import { makeFastify } from '@rosen-bridge/fastify-enhanced';
import { TransactionType } from '@rosen-chains/abstract-chain';

import { eventRoutes } from '../../src/api/events';
import EventSerializer from '../../src/event/eventSerializer';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import { mockPaymentTransaction } from '../agreement/testData';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from '../db/bitcoinCashNamespaceFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

vi.mock('../../src/utils/getTokenData', () => ({
  getTokenData: () => ({
    name: 'test token',
    decimals: 6,
    isNativeToken: false,
  }),
}));

describe('BCH ongoing API identity correlation', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());

  it('joins separate BTC/BCH transaction statuses while returning unchanged wire IDs', async () => {
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin'),
      'btc-trigger',
      EventStatus.inPayment,
    );
    const bch = await insertNamespaceEvent(
      namespaceEvent(),
      'bch-trigger',
      EventStatus.inPayment,
    );
    await DatabaseActionMock.insertTxRecord(
      mockPaymentTransaction(
        TransactionType.payment,
        'ergo',
        EventSerializer.getId(bitcoin),
      ),
      TransactionStatus.approved,
    );
    await DatabaseActionMock.insertTxRecord(
      mockPaymentTransaction(
        TransactionType.payment,
        'ergo',
        EventSerializer.getId(bch),
      ),
      TransactionStatus.inSign,
    );
    const server = await makeFastify();
    server.register(eventRoutes);
    try {
      const response = await server.inject({
        method: 'GET',
        url: '/event/ongoing',
      });
      expect(response.statusCode).toBe(200);
      const items = response.json().items;
      expect(items).toHaveLength(2);
      expect(
        items.find((e: { fromChain: string }) => e.fromChain === 'bitcoin'),
      ).toMatchObject({
        eventId: bitcoin.eventId,
        status: `${EventStatus.inPayment} (${TransactionStatus.approved})`,
      });
      expect(
        items.find(
          (e: { fromChain: string }) => e.fromChain === 'bitcoin-cash',
        ),
      ).toMatchObject({
        eventId: bch.eventId,
        status: `${EventStatus.inPayment} (${TransactionStatus.inSign})`,
      });
    } finally {
      await server.close();
    }
  });
});
