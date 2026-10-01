import { TransactionType } from '@rosen-chains/abstract-chain';
import { ErgoTransaction } from '@rosen-chains/ergo';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventProcessor from '../../src/event/eventProcessor';
import EventSerializer from '../../src/event/eventSerializer';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { getTxDataHash } from '../../src/transaction/transactionSerializer';
import Utils from '../../src/utils/utils';
import EventVerifier from '../../src/verification/eventVerifier';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from '../db/bitcoinCashNamespaceFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

describe('BCH guard namespace compatibility', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());
  afterEach(() => vi.restoreAllMocks());

  it('freezes BCH ASCII domain bytes while retaining the request hash and txid spelling', () => {
    const event = namespaceEvent();
    expect(EventSerializer.getRequestId(event)).toBe(
      '57d93da7fd25ff5c9a77ae8e1daa982e2c320346ab67c517e9f389fae8434533',
    );
    expect(EventSerializer.getId(event)).toBe(
      '8a424e1b276cac4e7838b243a1fe7cce175f00aaf5b4a16e7a0f1d24b96c1175',
    );
    expect(
      EventSerializer.getId({ ...event, sourceTxId: 'AA'.repeat(32) }),
    ).toBe('2dfc7ea51402adca42d47a79d3010c9f2b82ee62c08939d4abf91067a84cec46');
    expect(
      EventSerializer.getId({ ...event, sourceTxId: 'aa'.repeat(32) }),
    ).not.toBe(
      EventSerializer.getId({ ...event, sourceTxId: 'AA'.repeat(32) }),
    );
  });

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
      const event = namespaceEvent(fromChain, { toChain: 'bitcoin-cash' });
      expect(EventSerializer.getId(event)).toBe(
        '57d93da7fd25ff5c9a77ae8e1daa982e2c320346ab67c517e9f389fae8434533',
      );
      expect(EventSerializer.getRequestId(event)).toBe(
        Utils.txIdToEventId(event.sourceTxId),
      );
    },
  );

  it.each([
    ['bitcoin', 'bitcoin-cash'],
    ['bitcoin-cash', 'bitcoin'],
  ])(
    'verifies and admits same-txid %s then %s independently',
    async (first, second) => {
      const raws = [
        await insertNamespaceEvent(namespaceEvent(first), `${first}-trigger`),
        await insertNamespaceEvent(namespaceEvent(second), `${second}-trigger`),
      ];
      const db = DatabaseAction.getInstance();
      await db.ConfirmedEventRepository.clear();
      vi.spyOn(db, 'getUnconfirmedEvents').mockResolvedValue(raws);
      vi.spyOn(EventVerifier, 'isEventConfirmedEnough').mockResolvedValue(true);
      const verify = vi
        .spyOn(EventVerifier, 'verifyEvent')
        .mockResolvedValue(true);
      vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(
        {} as ReturnType<typeof MinimumFeeHandler.getEventFeeConfig>,
      );
      await EventProcessor.processScannedEvents();
      expect(verify).toHaveBeenCalledTimes(2);
      expect(await db.ConfirmedEventRepository.count()).toBe(2);
      expect(await db.RejectedEventRepository.count()).toBe(0);
    },
  );

  it('still rejects a second verified trigger for the same BCH source txid', async () => {
    const first = await insertNamespaceEvent(namespaceEvent(), 'first-trigger');
    const second = await insertNamespaceEvent(
      namespaceEvent('bitcoin-cash', { sourceTxId: '55'.repeat(32) }),
      'second-trigger',
    );
    const db = DatabaseAction.getInstance();
    await db.ConfirmedEventRepository.delete(EventSerializer.getId(second));
    await db.EventRepository.update(second.id, {
      sourceTxId: first.sourceTxId,
      eventId: first.eventId,
    });
    second.sourceTxId = first.sourceTxId;
    second.eventId = first.eventId;
    vi.spyOn(db, 'getUnconfirmedEvents').mockResolvedValue([second]);
    vi.spyOn(EventVerifier, 'isEventConfirmedEnough').mockResolvedValue(true);
    const verify = vi.spyOn(EventVerifier, 'verifyEvent');
    await EventProcessor.processScannedEvents();
    expect(verify).not.toHaveBeenCalled();
    expect(
      (
        await db.RejectedEventRepository.findOneByOrFail({
          eventDataId: second.id,
        })
      ).reason,
    ).toBe('duplicate-trigger');
  });

  it.each([TransactionType.payment, TransactionType.reward])(
    'binds the BCH guard ID in Ergo %s JSON without rewriting frozen transaction/input bytes',
    (type) => {
      const event = namespaceEvent();
      const bytes = Buffer.from('frozen-transaction-bytes');
      const legacy = new ErgoTransaction(
        'tx-id',
        EventSerializer.getRequestId(event),
        bytes,
        type,
        [Buffer.from('input')],
        [Buffer.from('data-input')],
      );
      const bch = new ErgoTransaction(
        'tx-id',
        EventSerializer.getId(event),
        bytes,
        type,
        [Buffer.from('input')],
        [Buffer.from('data-input')],
      );
      const roundTrip = ErgoTransaction.fromJson(bch.toJson());
      expect(roundTrip.eventId).toBe(EventSerializer.getId(event));
      expect(roundTrip.txBytes).toEqual(bytes);
      expect(roundTrip.inputBoxes).toEqual(legacy.inputBoxes);
      expect(roundTrip.dataInputs).toEqual(legacy.dataInputs);
      expect(getTxDataHash(bch)).not.toBe(getTxDataHash(legacy));
    },
  );
});
