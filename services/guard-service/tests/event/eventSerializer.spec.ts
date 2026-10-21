import bchGuardNamespace_EventSerializer from '../../src/event/eventSerializer';
import bchGuardNamespace_Utils from '../../src/utils/utils';
import { namespaceEvent as bchGuardNamespace_namespaceEvent } from '../db/bitcoinCashNamespaceTestUtils';
import bchGuardNamespace_DatabaseActionMock from '../db/mocked/databaseAction.mock';

describe('EventSerializer', () => {
  describe('getId', () => {
    describe('BCH RCS bitcoinCashGuardNamespace', () => {
      beforeEach(async () =>
        bchGuardNamespace_DatabaseActionMock.clearTables(),
      );
      afterEach(() => vi.restoreAllMocks());
      /**
       * @target EventSerializer.getId - freezes BCH ASCII domain bytes while
       * retaining the request hash and txid spelling
       * @dependencies EventSerializer, namespace fixture generator, SQLite
       * DatabaseActionMock, ErgoTransaction and mocked fee/event verification
       * seams.
       * @scenario freezes BCH ASCII domain bytes while retaining the request
       * hash and txid spelling.
       * @expected Return the pinned ASCII-domain BCH guard hash while
       * retaining the request hash; preserve every legacy source hash.
       */
      it('freezes BCH ASCII domain bytes while retaining the request hash and txid spelling', () => {
        const event = bchGuardNamespace_namespaceEvent();
        expect(bchGuardNamespace_EventSerializer.getRequestId(event)).toEqual(
          '57d93da7fd25ff5c9a77ae8e1daa982e2c320346ab67c517e9f389fae8434533',
        );
        expect(bchGuardNamespace_EventSerializer.getId(event)).toEqual(
          '8a424e1b276cac4e7838b243a1fe7cce175f00aaf5b4a16e7a0f1d24b96c1175',
        );
        expect(
          bchGuardNamespace_EventSerializer.getId({
            ...event,
            sourceTxId: 'AA'.repeat(32),
          }),
        ).toEqual(
          '2dfc7ea51402adca42d47a79d3010c9f2b82ee62c08939d4abf91067a84cec46',
        );
        expect(
          bchGuardNamespace_EventSerializer.getId({
            ...event,
            sourceTxId: 'aa'.repeat(32),
          }),
        ).not.toEqual(
          bchGuardNamespace_EventSerializer.getId({
            ...event,
            sourceTxId: 'AA'.repeat(32),
          }),
        );
      });
      /**
       * @target EventSerializer.getId - retains the exact legacy %s source
       * identity, including BCH destinations
       * @dependencies EventSerializer, namespace fixture generator, SQLite
       * DatabaseActionMock, ErgoTransaction and mocked fee/event verification
       * seams.
       * @scenario retains the exact legacy %s source identity, including BCH
       * destinations.
       * @expected Return the pinned ASCII-domain BCH guard hash while
       * retaining the request hash; preserve every legacy source hash.
       */
      it.each([
        'bitcoin',
        'ergo',
        'cardano',
        'doge',
        'firo',
        'handshake',
        'ethereum',
        'binance',
        'bitcoin-runes',
      ])(
        'retains the exact legacy %s source identity, including BCH destinations',
        (fromChain) => {
          const event = bchGuardNamespace_namespaceEvent(fromChain, {
            toChain: 'bitcoin-cash',
          });
          expect(bchGuardNamespace_EventSerializer.getId(event)).toEqual(
            '57d93da7fd25ff5c9a77ae8e1daa982e2c320346ab67c517e9f389fae8434533',
          );
          expect(bchGuardNamespace_EventSerializer.getRequestId(event)).toEqual(
            bchGuardNamespace_Utils.txIdToEventId(event.sourceTxId),
          );
        },
      );
    });
  });
});
