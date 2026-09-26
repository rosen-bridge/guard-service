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
  assertZcashEventRewardSnapshot,
  ZcashEventRewardAuthority,
} from '../../src/transaction/zcashEventRewardAuthority';
import { EventStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

const source = DatabaseActionMock.testDataSource;
const db = DatabaseActionMock.testDatabase;
const tokens = TokenHandler.getInstance().getTokenMap();
let original: RosenTokens;
let fee: ChainMinimumFee;
const event = (): EventTrigger => ({
  height: 106,
  fromChain: 'ergo',
  toChain: 'zcash',
  fromAddress: 'source',
  toAddress: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs',
  amount: '100000000',
  bridgeFee: '1000000',
  networkFee: '10000',
  sourceChainTokenId: 'ab'.repeat(32),
  targetChainTokenId: 'zec',
  sourceTxId: '11'.repeat(32),
  sourceChainHeight: 106,
  sourceBlockId: '22'.repeat(32),
  WIDsHash: '33'.repeat(32),
  WIDsCount: 4,
});

beforeAll(() => {
  original = tokens.getRawConfig();
});
beforeEach(async () => {
  await DatabaseActionMock.clearTables();
  await tokens.updateConfigByJson([
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
        tokenId: 'ab'.repeat(32),
        name: 'rsZEC',
        decimals: 8,
        type: 'token',
        residency: 'wrapped',
        extra: {},
      },
    },
  ]);
  fee = {
    bridgeFee: 2000000n,
    networkFee: 20000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 100n,
    feeRatioDivisor: 10000n,
  };
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockImplementation(
    () => fee,
  );
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: () => ({ getMinimumNativeToken: () => 1000n }),
  } as unknown as ChainHandler);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await tokens.updateConfigByJson(original);
});

async function fixture() {
  const value = event();
  const id = EventSerializer.getId(value);
  await DatabaseActionMock.insertEventRecord(
    value,
    EventStatus.inPayment,
    Buffer.from('retained-trigger').toString('base64'),
    106,
  );
  const row = (await db.getEventById(id))!;
  await db.EventRepository.update(
    { id: row.eventData.id },
    {
      spendHeight: null,
      spendBlock: null,
      spendTxId: null,
      result: null,
      paymentTxId: null,
    },
  );
  return {
    id,
    rawId: row.eventData.id,
    provider: new ZcashEventRewardAuthority(source),
  };
}

describe('Zcash actual reward trigger authority', () => {
  it('retains an empty source block field exactly without claiming source inclusion', async () => {
    const f = await fixture();
    await db.EventRepository.update({ id: f.rawId }, { sourceBlockId: '' });
    const snapshot = await f.provider.capture(f.id);
    expect(JSON.parse(snapshot.eventContextJson).raw.sourceBlockId).toBe('');
    await db.EventRepository.update(
      { id: f.rawId },
      { sourceBlockId: '44'.repeat(32) },
    );
    await expect(snapshot.assertCurrent()).rejects.toThrow(
      /stored trigger changed/,
    );
  });

  it('issues frozen current context and executes a real raw-row CAS', async () => {
    const f = await fixture();
    const snapshot = await f.provider.capture(f.id);
    assertZcashEventRewardSnapshot(snapshot);
    expect(() => assertZcashEventRewardSnapshot({ ...snapshot })).toThrow(
      /unknown snapshot/,
    );
    expect(Object.isFrozen(snapshot.payments[0].assets)).toBe(true);
    expect(JSON.parse(snapshot.eventContextJson).raw.serialized).toBe(
      Buffer.from('retained-trigger').toString('base64'),
    );
    await source.transaction((manager) =>
      snapshot.assertStoredEvent(manager, f.id),
    );
    await snapshot.assertCurrent();
  });

  it.each([
    'spendHeight',
    'spendBlock',
    'spendTxId',
    'result',
    'paymentTxId',
  ] as const)(
    'refuses isolated %s at capture and after issuance',
    async (field) => {
      const f = await fixture();
      const snapshot = await f.provider.capture(f.id);
      await db.EventRepository.update(
        { id: f.rawId },
        { [field]: field === 'spendHeight' ? 107 : 'spent' },
      );
      await expect(f.provider.capture(f.id)).rejects.toThrow(/spent/);
      await expect(snapshot.assertCurrent()).rejects.toThrow(/spent/);
      await expect(
        source.transaction((manager) =>
          snapshot.assertStoredEvent(manager, f.id),
        ),
      ).rejects.toThrow(/spent/);
    },
  );

  it.each([
    ['extractor', 'other'],
    ['identifier', 'other'],
    ['serialized', Buffer.from('different-trigger').toString('base64')],
    ['block', 'other'],
    ['height', 107],
    ['eventId', '44'.repeat(32)],
    ['txId', '44'.repeat(32)],
    ['fromChain', 'other'],
    ['toChain', 'other'],
    ['fromAddress', 'other'],
    ['toAddress', 'other'],
    ['amount', '100000001'],
    ['bridgeFee', '1000001'],
    ['networkFee', '10001'],
    ['sourceChainTokenId', 'other'],
    ['sourceChainHeight', 107],
    ['targetChainTokenId', 'other'],
    ['sourceTxId', '44'.repeat(32)],
    ['sourceBlockId', '44'.repeat(32)],
    ['WIDsCount', 5],
    ['WIDsHash', '44'.repeat(32)],
  ] as const)(
    'rejects same confirmed ID with isolated raw %s drift',
    async (field, value) => {
      const f = await fixture();
      const snapshot = await f.provider.capture(f.id);
      await db.EventRepository.update({ id: f.rawId }, {
        [field]: value,
      } as Partial<EventTriggerEntity>);
      await expect(snapshot.assertCurrent()).rejects.toThrow();
      await expect(
        source.transaction((manager) =>
          snapshot.assertStoredEvent(manager, f.id),
        ),
      ).rejects.toThrow();
    },
  );

  it.each([
    EventStatus.completed,
    EventStatus.pendingPayment,
    EventStatus.rejected,
  ])('does not reopen %s as reward eligible', async (status) => {
    const f = await fixture();
    await db.ConfirmedEventRepository.update({ id: f.id }, { status });
    await expect(f.provider.capture(f.id, 'reward')).rejects.toThrow(
      /event binding/,
    );
  });

  it.each([
    EventStatus.pendingReward,
    EventStatus.inReward,
    EventStatus.rewardWaiting,
  ])('accepts %s only in reward phase', async (status) => {
    const f = await fixture();
    await db.ConfirmedEventRepository.update({ id: f.id }, { status });
    await expect(f.provider.capture(f.id, 'reward')).resolves.toMatchObject({
      eventId: f.id,
    });
    await expect(f.provider.capture(f.id)).rejects.toThrow(/event binding/);
  });

  it('refuses an ambiguous actual EventBoxes txId lookup', async () => {
    const f = await fixture();
    const snapshot = await f.provider.capture(f.id);
    const raw = (await db.EventRepository.findOneBy({ id: f.rawId }))!;
    const duplicate = db.EventRepository.create({
      ...raw,
      id: undefined,
      identifier: 'other-box',
      eventId: '55'.repeat(32),
    });
    await db.EventRepository.save(duplicate);
    await expect(f.provider.capture(f.id)).rejects.toThrow(/ambiguous/);
    await expect(snapshot.assertCurrent()).rejects.toThrow(/ambiguous/);
  });

  it('rejects replacing the confirmed relation with an otherwise identical raw row', async () => {
    const f = await fixture();
    const snapshot = await f.provider.capture(f.id);
    const raw = (await db.EventRepository.findOneBy({ id: f.rawId }))!;
    const replacementId = f.rawId + 1;
    await source.transaction(async (manager) => {
      const relation = () =>
        manager
          .createQueryBuilder()
          .relation(ConfirmedEventEntity, 'eventData')
          .of(f.id);
      await relation().set(null);
      await manager.getRepository(EventTriggerEntity).delete({ id: f.rawId });
      await manager.getRepository(EventTriggerEntity).insert({
        ...raw,
        id: replacementId,
      });
      await relation().set(replacementId);
    });
    const matches = await db.EventRepository.find({
      where: { txId: raw.txId },
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe(replacementId);
    expect(matches[0]).toEqual({ ...raw, id: replacementId });

    await expect(snapshot.assertCurrent()).rejects.toThrow(
      /stored trigger changed/,
    );
    await expect(
      source.transaction((manager) =>
        snapshot.assertStoredEvent(manager, f.id),
      ),
    ).rejects.toThrow(/stored trigger changed/);
  });

  it('rejects malformed serialized bytes and changed live fee policy', async () => {
    const f = await fixture();
    const snapshot = await f.provider.capture(f.id);
    fee.bridgeFee++;
    expect(() => snapshot.assertPolicyCurrent()).toThrow(/policy changed/);
    await db.EventRepository.update(
      { id: f.rawId },
      { serialized: 'not-base64' },
    );
    await expect(f.provider.capture(f.id)).rejects.toThrow(
      /serialized trigger/,
    );
  });
});
