import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { RosenTokens } from '@rosen-bridge/tokens';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import { EventTrigger } from '@rosen-chains/abstract-chain';

import { ConfirmedEventEntity } from '../../src/db/entities/confirmedEventEntity';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import {
  assertZcashEventPaymentSnapshot,
  ZcashEventPaymentAuthority,
} from '../../src/transaction/zcashEventPaymentAuthority';
import { EventStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

const source = DatabaseActionMock.testDataSource;
const tokenMap = TokenHandler.getInstance().getTokenMap();
const zecErgoId = 'ab'.repeat(32);
const zecCardanoId = 'cardano-zec';
const tokenConfig = (ergoId = zecErgoId): RosenTokens => [
  {
    zcash: {
      tokenId: 'zec',
      name: 'ZEC',
      decimals: 8,
      type: 'native',
      residency: 'native',
      extra: {},
    },
    ergo: {
      tokenId: ergoId,
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
    cardano: {
      tokenId: zecCardanoId,
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
  },
];

const event = (): EventTrigger => ({
  height: 106,
  fromChain: 'cardano',
  toChain: 'zcash',
  fromAddress: 'source',
  toAddress: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs',
  amount: '100000000',
  bridgeFee: '1000000',
  networkFee: '10000',
  sourceChainTokenId: zecCardanoId,
  targetChainTokenId: 'zec',
  sourceTxId: '11'.repeat(32),
  sourceChainHeight: 106,
  sourceBlockId: '22'.repeat(32),
  WIDsHash: '33'.repeat(32),
  WIDsCount: 4,
});

const baseFee = (): ChainMinimumFee =>
  ({
    bridgeFee: 2_000_000n,
    networkFee: 20_000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 100n,
    feeRatioDivisor: 10_000n,
  }) as ChainMinimumFee;

let originalTokens: RosenTokens;
let fee: ChainMinimumFee;
let chainMinimum: bigint;

beforeAll(() => {
  originalTokens = tokenMap.getRawConfig();
});

beforeEach(async () => {
  await DatabaseActionMock.clearTables();
  await tokenMap.updateConfigByJson(tokenConfig());
  fee = baseFee();
  chainMinimum = 1_000n;
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockImplementation(
    () => fee,
  );
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: (chain: string) => {
      if (chain !== 'zcash') throw Error('unexpected chain');
      return { getMinimumNativeToken: () => chainMinimum };
    },
  } as unknown as ChainHandler);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await tokenMap.updateConfigByJson(originalTokens);
});

async function insertedEvent() {
  const value = event();
  const eventId = EventSerializer.getId(value);
  await DatabaseActionMock.insertEventRecord(
    value,
    EventStatus.inPayment,
    'event-box',
    value.sourceChainHeight,
  );
  const row = await DatabaseActionMock.testDatabase.getEventById(eventId);
  if (!row?.eventData) throw Error('test event missing');
  return { value, eventId, row };
}

describe('Zcash event payment authority', () => {
  it('captures the persisted event and actual Rosen payment formula as a deep-frozen issued snapshot', async () => {
    const { eventId } = await insertedEvent();
    const snapshot = await new ZcashEventPaymentAuthority(source).capture(
      eventId,
    );

    assertZcashEventPaymentSnapshot(snapshot);
    expect(snapshot.eventId).toBe(eventId);
    expect(snapshot.payments).toEqual([
      {
        address: event().toAddress,
        assets: { nativeToken: 97_981_000n, tokens: [] },
      },
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.payments)).toBe(true);
    expect(Object.isFrozen(snapshot.payments[0])).toBe(true);
    expect(Object.isFrozen(snapshot.payments[0].assets)).toBe(true);
    expect(Object.isFrozen(snapshot.payments[0].assets.tokens)).toBe(true);
    expect(() =>
      assertZcashEventPaymentSnapshot({
        ...snapshot,
        payments: structuredClone(snapshot.payments),
      }),
    ).toThrow(/unknown snapshot/);
  });

  it.each([
    ['txId', { txId: 'changed' }],
    ['height', { height: 107 }],
    ['fromChain', { fromChain: 'changed' }],
    ['toChain', { toChain: 'changed' }],
    ['fromAddress', { fromAddress: 'changed' }],
    ['toAddress', { toAddress: 'changed' }],
    ['amount', { amount: '100000001' }],
    ['bridgeFee', { bridgeFee: '1000001' }],
    ['networkFee', { networkFee: '10001' }],
    ['sourceChainTokenId', { sourceChainTokenId: 'changed' }],
    ['targetChainTokenId', { targetChainTokenId: 'changed' }],
    ['sourceTxId', { sourceTxId: '44'.repeat(32) }],
    ['sourceChainHeight', { sourceChainHeight: 107 }],
    ['sourceBlockId', { sourceBlockId: '44'.repeat(32) }],
    ['WIDsHash', { WIDsHash: '44'.repeat(32) }],
    ['WIDsCount', { WIDsCount: 5 }],
  ] as const)(
    'rejects changed persisted %s while the confirmed id is unchanged',
    async (_name, change) => {
      const { eventId, row } = await insertedEvent();
      const snapshot = await new ZcashEventPaymentAuthority(source).capture(
        eventId,
      );
      await DatabaseActionMock.testDatabase.EventRepository.update(
        { id: row.eventData.id },
        change as Partial<EventTriggerEntity>,
      );
      await expect(snapshot.assertCurrent()).rejects.toThrow();
    },
  );

  it('binds the event-data relation identity even when its event id remains unchanged', async () => {
    const { eventId, row } = await insertedEvent();
    const snapshot = await new ZcashEventPaymentAuthority(source).capture(
      eventId,
    );
    await DatabaseActionMock.testDatabase.EventRepository.update(
      { id: row.eventData.id },
      { txId: 'different-event-row-transaction' },
    );

    await expect(snapshot.assertCurrent()).rejects.toThrow(
      /stored event changed/,
    );
    await expect(
      source.transaction((manager) =>
        snapshot.assertStoredEvent(manager, eventId),
      ),
    ).rejects.toThrow(/stored event changed/);
  });

  it('rejects swapping the confirmed relation to a second raw row with the same event content', async () => {
    const { eventId, row } = await insertedEvent();
    const snapshot = await new ZcashEventPaymentAuthority(source).capture(
      eventId,
    );
    const copy = { ...row.eventData };
    Reflect.deleteProperty(copy, 'id');
    const inserted =
      await DatabaseActionMock.testDatabase.EventRepository.insert({
        ...copy,
        identifier: 'second-event-row',
        txId: 'second-event-row-transaction',
      });
    await DatabaseActionMock.testDatabase.ConfirmedEventRepository.createQueryBuilder()
      .relation(ConfirmedEventEntity, 'eventData')
      .of(eventId)
      .set(inserted.identifiers[0].id);

    await expect(snapshot.assertCurrent()).rejects.toThrow(
      /stored event changed/,
    );
  });

  it.each(['fee', 'minimum', 'token'] as const)(
    'rejects current %s policy drift',
    async (kind) => {
      const { eventId } = await insertedEvent();
      const snapshot = await new ZcashEventPaymentAuthority(source).capture(
        eventId,
      );
      if (kind === 'fee') fee = { ...fee, bridgeFee: fee.bridgeFee + 1n };
      if (kind === 'minimum') chainMinimum++;
      if (kind === 'token')
        await tokenMap.updateConfigByJson(tokenConfig('cd'.repeat(32)));

      expect(() => snapshot.assertPolicyCurrent()).toThrow();
      await expect(snapshot.assertCurrent()).rejects.toThrow();
    },
  );

  it('rejects an ambiguous source-token mapping before minimum-fee selection', async () => {
    const { eventId } = await insertedEvent();
    await tokenMap.updateConfigByJson([
      {
        ergo: {
          tokenId: 'ef'.repeat(32),
          name: 'other',
          decimals: 8,
          type: 'token',
          residency: 'native',
          extra: {},
        },
        cardano: {
          tokenId: zecCardanoId,
          name: 'other',
          decimals: 8,
          type: 'token',
          residency: 'wrapped',
          extra: {},
        },
      },
      ...tokenConfig(),
    ]);
    vi.mocked(MinimumFeeHandler.getEventFeeConfig).mockClear();

    await expect(
      new ZcashEventPaymentAuthority(source).capture(eventId),
    ).rejects.toThrow(/token configuration/);
    expect(MinimumFeeHandler.getEventFeeConfig).not.toHaveBeenCalled();
  });

  it.each(['fee', 'minimum', 'token'] as const)(
    'checks %s policy again after the asynchronous stored-event read',
    async (kind) => {
      const { eventId } = await insertedEvent();
      const snapshot = await new ZcashEventPaymentAuthority(source).capture(
        eventId,
      );
      const repository = source.getRepository(ConfirmedEventEntity);
      const findOne = repository.findOne.bind(repository);
      let release!: () => void;
      const paused = new Promise<void>((resolve) => {
        release = resolve;
      });
      vi.spyOn(repository, 'findOne').mockImplementation(async (options) => {
        await paused;
        return findOne(options);
      });

      const pending = snapshot.assertCurrent();
      if (kind === 'fee') fee = { ...fee, networkFee: fee.networkFee + 1n };
      if (kind === 'minimum') chainMinimum++;
      if (kind === 'token')
        await tokenMap.updateConfigByJson(tokenConfig('cd'.repeat(32)));
      release();
      await expect(pending).rejects.toThrow();
    },
  );

  it('checks and touches the exact event row inside the supplied transaction', async () => {
    const { eventId, row } = await insertedEvent();
    const snapshot = await new ZcashEventPaymentAuthority(source).capture(
      eventId,
    );

    await source.transaction((manager) =>
      snapshot.assertStoredEvent(manager, eventId),
    );
    expect(
      (
        await DatabaseActionMock.testDatabase.EventRepository.findOneByOrFail({
          id: row.eventData.id,
        })
      ).id,
    ).toBe(row.eventData.id);
    await expect(
      source.transaction((manager) =>
        snapshot.assertStoredEvent(manager, '00'.repeat(32)),
      ),
    ).rejects.toThrow(/event id mismatch/);
  });

  it('rejects a raw mutation between the relation read and the transactional CAS', async () => {
    const { eventId, row } = await insertedEvent();
    const snapshot = await new ZcashEventPaymentAuthority(source).capture(
      eventId,
    );

    await expect(
      source.transaction(async (manager) => {
        const repository = manager.getRepository(EventTriggerEntity);
        const update = repository.update.bind(repository);
        vi.spyOn(repository, 'update').mockImplementationOnce(
          async (criteria, partial) => {
            await manager
              .createQueryBuilder()
              .update(EventTriggerEntity)
              .set({ amount: '100000001' })
              .where({ id: row.eventData.id })
              .execute();
            return update(criteria, partial);
          },
        );
        await snapshot.assertStoredEvent(manager, eventId);
      }),
    ).rejects.toThrow(/stored event changed/);
    expect(
      (
        await DatabaseActionMock.testDatabase.EventRepository.findOneByOrFail({
          id: row.eventData.id,
        })
      ).amount,
    ).toBe(event().amount);
  });

  it.each([
    [
      'status',
      async (eventId: string) => {
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.update(
          { id: eventId },
          { status: EventStatus.rejected },
        );
      },
    ],
    [
      'confirmed relation',
      async (_eventId: string, row: ConfirmedEventEntity) => {
        await DatabaseActionMock.testDatabase.EventRepository.update(
          { id: row.eventData.id },
          { eventId: '00'.repeat(32) },
        );
      },
    ],
  ] as const)('rejects invalid persisted %s binding', async (_name, alter) => {
    const { eventId, row } = await insertedEvent();
    await alter(eventId, row);
    await expect(
      new ZcashEventPaymentAuthority(source).capture(eventId),
    ).rejects.toThrow(/event binding/);
  });
});
