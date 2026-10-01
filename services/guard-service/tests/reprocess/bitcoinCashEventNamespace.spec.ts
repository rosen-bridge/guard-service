import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';

import { DatabaseAction } from '../../src/db/databaseAction';
import EventSerializer from '../../src/event/eventSerializer';
import EventReprocess from '../../src/reprocess/eventReprocess';
import { EventStatus } from '../../src/utils/constants';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from '../db/bitcoinCashNamespaceFixtures';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

class NamespaceReprocess extends EventReprocess {
  constructor() {
    super();
  }
  apply = (raw: EventTriggerEntity) => this.checkAndApplyReprocess(raw);
}

describe('BCH reprocess identity', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());

  it.each([
    [EventStatus.paymentWaiting, EventStatus.pendingPayment],
    [EventStatus.rewardWaiting, EventStatus.pendingReward],
  ])(
    'updates BCH %s without changing the colliding BTC event',
    async (status, next) => {
      const bitcoin = await insertNamespaceEvent(
        namespaceEvent('bitcoin'),
        'btc-trigger',
        EventStatus.timeout,
      );
      const bch = await insertNamespaceEvent(
        namespaceEvent(),
        'bch-trigger',
        status,
      );
      expect(await new NamespaceReprocess().apply(bch)).toBe(true);
      const db = DatabaseAction.getInstance();
      expect((await db.getEventById(EventSerializer.getId(bch)))?.status).toBe(
        next,
      );
      expect(
        (await db.getEventById(EventSerializer.getId(bitcoin)))?.status,
      ).toBe(EventStatus.timeout);
    },
  );

  it('does not requeue a completed BCH event because BTC is waiting', async () => {
    const bitcoin = await insertNamespaceEvent(
      namespaceEvent('bitcoin'),
      'btc-trigger',
      EventStatus.paymentWaiting,
    );
    const bch = await insertNamespaceEvent(
      namespaceEvent(),
      'bch-trigger',
      EventStatus.completed,
    );
    expect(await new NamespaceReprocess().apply(bch)).toBe(false);
    expect(
      (
        await DatabaseAction.getInstance().getEventById(
          EventSerializer.getId(bitcoin),
        )
      )?.status,
    ).toBe(EventStatus.paymentWaiting);
  });
});
