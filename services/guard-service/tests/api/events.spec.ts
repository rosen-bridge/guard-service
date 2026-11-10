import { makeFastify as bchApi_makeFastify } from '@rosen-bridge/fastify-enhanced';
import { TransactionType as bchApi_TransactionType } from '@rosen-chains/abstract-chain';

import { eventRoutes as bchApi_eventRoutes } from '../../src/api/events';
import bchApi_EventSerializer from '../../src/event/eventSerializer';
import {
  EventStatus as bchApi_EventStatus,
  TransactionStatus as bchApi_TransactionStatus,
} from '../../src/utils/constants';
import { mockPaymentTransaction as bchApi_mockPaymentTransaction } from '../agreement/testData';
import {
  insertNamespaceEvent as bchApi_insertNamespaceEvent,
  namespaceEvent as bchApi_namespaceEvent,
} from '../db/bitcoinCashNamespaceTestUtils';
import bchApi_DatabaseActionMock from '../db/mocked/databaseAction.mock';

describe('eventRoutes', () => {
  describe('BCH RCS bitcoinCashEventNamespace', () => {
    beforeEach(async () => bchApi_DatabaseActionMock.clearTables());
    /**
     * @target eventRoutes - joins separate BTC/BCH transaction statuses while
     * returning unchanged wire IDs
     * @dependencies SQLite namespace fixtures, DatabaseActionMock,
     * transaction envelopes, mocked getTokenData and in-process Fastify
     * injection.
     * @scenario joins separate BTC/BCH transaction statuses while returning
     * unchanged wire IDs.
     * @expected Return HTTP 200 and separate BTC/BCH statuses under their
     * unchanged wire request identifiers.
     */
    it('joins separate BTC/BCH transaction statuses while returning unchanged wire IDs', async () => {
      const bitcoin = await bchApi_insertNamespaceEvent(
        bchApi_namespaceEvent('bitcoin'),
        'btc-trigger',
        bchApi_EventStatus.inPayment,
      );
      const bch = await bchApi_insertNamespaceEvent(
        bchApi_namespaceEvent(),
        'bch-trigger',
        bchApi_EventStatus.inPayment,
      );
      await bchApi_DatabaseActionMock.insertTxRecord(
        bchApi_mockPaymentTransaction(
          bchApi_TransactionType.payment,
          'ergo',
          bchApi_EventSerializer.getId(bitcoin),
        ),
        bchApi_TransactionStatus.approved,
      );
      await bchApi_DatabaseActionMock.insertTxRecord(
        bchApi_mockPaymentTransaction(
          bchApi_TransactionType.payment,
          'ergo',
          bchApi_EventSerializer.getId(bch),
        ),
        bchApi_TransactionStatus.inSign,
      );
      const server = await bchApi_makeFastify();
      server.register(bchApi_eventRoutes);
      try {
        const response = await server.inject({
          method: 'GET',
          url: '/event/ongoing',
        });
        expect(response.statusCode).toEqual(200);
        const items = response.json().items;
        expect(items).toHaveLength(2);
        expect(
          items.find((e: { fromChain: string }) => e.fromChain === 'bitcoin'),
        ).toMatchObject({
          eventId: bitcoin.eventId,
          status: `${bchApi_EventStatus.inPayment} (${bchApi_TransactionStatus.approved})`,
        });
        expect(
          items.find(
            (e: { fromChain: string }) => e.fromChain === 'bitcoin-cash',
          ),
        ).toMatchObject({
          eventId: bch.eventId,
          status: `${bchApi_EventStatus.inPayment} (${bchApi_TransactionStatus.inSign})`,
        });
      } finally {
        await server.close();
      }
    });
  });
});

vi.mock('../../src/utils/getTokenData', () => ({
  /** Provide the getTokenData test seam for the current scenario without external requests. */
  getTokenData: () => ({
    name: 'test token',
    decimals: 6,
    isNativeToken: false,
  }),
}));
