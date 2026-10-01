import { blake2b } from 'blakejs';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventBoxes from '../../src/event/eventBoxes';
import EventSerializer from '../../src/event/eventSerializer';
import {
  insertNamespaceCommitment,
  insertNamespaceEvent,
  namespaceEvent,
} from './bitcoinCashNamespaceFixtures';
import DatabaseActionMock from './mocked/databaseAction.mock';

describe('BCH guard event identity and commitment custody', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());

  it('persists BTC and BCH with the same wire request under distinct guard IDs', async () => {
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin'),
      'btc-trigger',
    );
    const bch = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
    const db = DatabaseAction.getInstance();
    expect(bitcoin.eventId).toBe(bch.eventId);
    expect(
      (await db.getEventById(EventSerializer.getId(bitcoin)))?.eventData.id,
    ).toBe(bitcoin.id);
    expect(
      (await db.getEventById(EventSerializer.getId(bch)))?.eventData.id,
    ).toBe(bch.id);
    await db.insertRejectedEvent(bch, 'test-reason');
    expect(
      (
        await db.RejectedEventRepository.findOneByOrFail({
          eventDataId: bch.id,
        })
      ).id,
    ).toBe(EventSerializer.getId(bch));
  });

  it('selects only the source extractor and actual trigger, even with one request, WID, and spend transaction', async () => {
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin'),
      'shared-trigger',
    );
    const bch = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
    await DatabaseAction.getInstance().EventRepository.update(bch.id, {
      txId: bitcoin.txId,
    });
    bch.txId = bitcoin.txId;
    const btcCommitment = await insertNamespaceCommitment(bitcoin);
    const bchCommitment = await insertNamespaceCommitment(bch);
    expect(
      (
        await DatabaseAction.getInstance().getEventCommitments(
          EventSerializer.getId(bitcoin),
        )
      ).map((c) => c.id),
    ).toEqual([btcCommitment.id]);
    expect(
      (
        await DatabaseAction.getInstance().getEventCommitments(
          EventSerializer.getId(bch),
        )
      ).map((c) => c.id),
    ).toEqual([bchCommitment.id]);
  });

  it('keeps merged commitment spend order', async () => {
    const bch = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
    const later = await insertNamespaceCommitment(bch, { spendIndex: 3 });
    const earlier = await insertNamespaceCommitment(bch, { spendIndex: 1 });
    expect(
      (
        await DatabaseAction.getInstance().getEventCommitments(
          EventSerializer.getId(bch),
        )
      ).map((c) => c.id),
    ).toEqual([earlier.id, later.id]);
  });

  it.each([
    { extractor: 'bitcoinCommitment' },
    { eventId: 'wrong-request' },
    { spendTxId: 'other-trigger' },
  ])(
    'excludes a single invalid merged commitment field: %j',
    async (change) => {
      const bch = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
      const valid = await insertNamespaceCommitment(bch);
      await insertNamespaceCommitment(bch, change);
      expect(
        (
          await DatabaseAction.getInstance().getEventCommitments(
            EventSerializer.getId(bch),
          )
        ).map((c) => c.id),
      ).toEqual([valid.id]);
    },
  );

  it.each([
    { extractor: 'bitcoinCommitment' },
    { eventId: 'wrong-request' },
    { height: 200 },
    { spendBlock: 'spent-block' },
  ])(
    'excludes a single invalid unmerged commitment field: %j',
    async (change) => {
      const bch = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
      const valid = await insertNamespaceCommitment(bch, {
        spendBlock: null,
        spendTxId: null,
      });
      await insertNamespaceCommitment(bch, {
        spendBlock: null,
        spendTxId: null,
        ...change,
      });
      expect(
        (
          await DatabaseAction.getInstance().getValidCommitments(
            EventSerializer.getId(bch),
            bch.height,
          )
        ).map((c) => c.id),
      ).toEqual([valid.id]);
    },
  );

  it('bridges BCH guard ID to wire commitments for EventBoxes and isolates the BTC same-WID record', async () => {
    const wid = 'ab'.repeat(32);
    const hash = Buffer.from(
      blake2b(Buffer.from(wid, 'hex'), undefined, 32),
    ).toString('hex');
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin', { WIDsHash: hash }),
      'btc-trigger',
    );
    const bch = await insertNamespaceEvent(
      namespaceEvent('bitcoin-cash', { WIDsHash: hash }),
      'bch-trigger',
    );
    await insertNamespaceCommitment(bitcoin, {
      spendBlock: null,
      spendTxId: null,
    });
    await insertNamespaceCommitment(bch, { spendBlock: null, spendTxId: null });
    expect(await EventBoxes.getEventValidCommitments(bch, 2n, [])).toEqual([
      Buffer.from('commitment').toString('hex'),
    ]);
    await insertNamespaceCommitment(bch);
    expect(await EventBoxes.getEventWIDs(bch)).toEqual([wid]);
    await expect(
      EventBoxes.getEventWIDs({ ...bch, WIDsCount: 2 }),
    ).rejects.toThrow('WIDs info');
    await expect(
      EventBoxes.getEventWIDs({ ...bch, WIDsHash: '00'.repeat(32) }),
    ).rejects.toThrow('WIDs info');
  });

  it('fails closed on absent guard identity rather than treating it as the wire ID', async () => {
    await expect(
      DatabaseAction.getInstance().getEventCommitments('missing'),
    ).rejects.toThrow('not found');
    await expect(
      DatabaseAction.getInstance().getValidCommitments('missing', 200),
    ).rejects.toThrow('not found');
  });

  it.each(['unregistered-source', '__proto__', 'constructor'])(
    'fails closed on unregistered source chain %s',
    async (source) => {
      const raw = await insertNamespaceEvent(
        namespaceEvent(source),
        'unknown-trigger',
      );
      await expect(
        DatabaseAction.getInstance().getEventCommitments(
          EventSerializer.getId(raw),
        ),
      ).rejects.toThrow('source chain');
      await expect(
        DatabaseAction.getInstance().getValidCommitments(
          EventSerializer.getId(raw),
          200,
        ),
      ).rejects.toThrow('source chain');
    },
  );

  it('rejects inconsistent persisted wire request metadata', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
    await DatabaseAction.getInstance().EventRepository.update(raw.id, {
      eventId: 'wrong-request',
    });
    const id = EventSerializer.getId(raw);
    await expect(
      DatabaseAction.getInstance().getEventCommitments(id),
    ).rejects.toThrow('inconsistent request identity');
    await expect(
      DatabaseAction.getInstance().getValidCommitments(id, raw.height),
    ).rejects.toThrow('inconsistent request identity');
  });

  it('rejects legacy BCH confirmed aliases instead of migrating them silently', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'bch-trigger');
    const db = DatabaseAction.getInstance();
    await db.ConfirmedEventRepository.update(EventSerializer.getId(raw), {
      id: raw.eventId,
    });
    await expect(db.getEventCommitments(raw.eventId)).rejects.toThrow(
      'incompatible guard identity',
    );
    await expect(
      db.getValidCommitments(raw.eventId, raw.height),
    ).rejects.toThrow('incompatible guard identity');
  });
});
