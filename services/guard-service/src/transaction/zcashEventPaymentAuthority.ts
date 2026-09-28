import { DataSource, EntityManager } from '@rosen-bridge/extended-typeorm';
import { RosenTokens } from '@rosen-bridge/tokens';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import {
  EventTrigger,
  PaymentOrder,
  SinglePayment,
} from '@rosen-chains/abstract-chain';
import { MAX_ZATOSHIS } from '@rosen-chains/zcash-payment';

import { ConfirmedEventEntity } from '../db/entities/confirmedEventEntity';
import EventOrder from '../event/eventOrder';
import EventSerializer from '../event/eventSerializer';
import ChainHandler from '../handlers/chainHandler';
import MinimumFeeHandler from '../handlers/minimumFeeHandler';
import { TokenHandler } from '../handlers/tokenHandler';
import { EventStatus } from '../utils/constants';

const ZCASH_CHAIN = 'zcash';
const ZEC = 'zec';
const MAX_AMOUNT = BigInt(MAX_ZATOSHIS);
const issuedSnapshots = new WeakSet<object>();

type EventFingerprint = Readonly<{
  confirmedId: string;
  eventDataId: number;
  eventDataEventId: string;
  eventDataTxId: string;
  height: number;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  bridgeFee: string;
  networkFee: string;
  sourceChainTokenId: string;
  targetChainTokenId: string;
  sourceTxId: string;
  sourceChainHeight: number;
  sourceBlockId: string;
  WIDsHash: string;
  WIDsCount: number;
}>;

type PolicyFingerprint = Readonly<{
  fee: readonly string[];
  token: string;
  chainMinimum: string;
  payment: string;
}>;

export interface ZcashEventPaymentSnapshot {
  readonly eventId: string;
  readonly payments: PaymentOrder;
  assertCurrent(): Promise<void>;
  assertPolicyCurrent(): void;
  assertStoredEvent(manager: EntityManager, eventId: string): Promise<void>;
}

const fail: (reason: string) => never = (reason) => {
  throw Error(`Invalid Zcash event payment authority: ${reason}`);
};

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const freezePayment = (payment: SinglePayment): SinglePayment =>
  Object.freeze({
    address: payment.address,
    assets: Object.freeze({
      nativeToken: payment.assets.nativeToken,
      tokens: Object.freeze([]),
    }),
  }) as unknown as SinglePayment;

const fingerprintEvent = (
  confirmed: ConfirmedEventEntity,
): EventFingerprint => {
  const eventData = confirmed.eventData;
  if (!eventData) fail('missing event relation');
  const event = EventSerializer.fromConfirmedEntity(confirmed);
  return Object.freeze({
    confirmedId: confirmed.id,
    eventDataId: eventData.id,
    eventDataEventId: eventData.eventId,
    eventDataTxId: eventData.txId,
    height: event.height,
    fromChain: event.fromChain,
    toChain: event.toChain,
    fromAddress: event.fromAddress,
    toAddress: event.toAddress,
    amount: event.amount,
    bridgeFee: event.bridgeFee,
    networkFee: event.networkFee,
    sourceChainTokenId: event.sourceChainTokenId,
    targetChainTokenId: event.targetChainTokenId,
    sourceTxId: event.sourceTxId,
    sourceChainHeight: event.sourceChainHeight,
    sourceBlockId: event.sourceBlockId,
    WIDsHash: event.WIDsHash,
    WIDsCount: event.WIDsCount,
  });
};

const tokenFingerprint = (config: RosenTokens, event: EventTrigger): string => {
  if (!Array.isArray(config)) fail('token configuration');
  const matches = config.filter((set) =>
    Object.values(set).some((token) => token.tokenId === ZEC),
  );
  if (matches.length !== 1) fail('token configuration');
  const set = matches[0];
  const sourceMatches = config.filter(
    (candidate) =>
      candidate[event.fromChain]?.tokenId === event.sourceChainTokenId,
  );
  const zcash = set[ZCASH_CHAIN];
  const ergo = set.ergo;
  const source = set[event.fromChain];
  if (
    sourceMatches.length !== 1 ||
    sourceMatches[0] !== set ||
    zcash?.tokenId !== ZEC ||
    zcash.decimals !== 8 ||
    zcash.type !== 'native' ||
    zcash.residency !== 'native' ||
    ergo?.decimals !== 8 ||
    !/^[0-9a-f]{64}$/.test(ergo?.tokenId ?? '') ||
    source?.tokenId !== event.sourceChainTokenId ||
    Object.values(set).some(
      (token) =>
        !Number.isSafeInteger(token.decimals) ||
        token.decimals < 8 ||
        token.decimals > 18,
    )
  )
    fail('token configuration');
  return JSON.stringify(
    Object.keys(set)
      .sort()
      .map((chain) => [
        chain,
        set[chain].tokenId,
        set[chain].decimals,
        set[chain].type,
        set[chain].residency,
      ]),
  );
};

const capturePolicy = (event: EventTrigger): PolicyFingerprint => {
  const tokenMap = TokenHandler.getInstance().getTokenMap();
  // Bind the exact source mapping before the fee helper performs its first-match lookup.
  const token = tokenFingerprint(tokenMap.getRawConfig(), event);
  const fee = MinimumFeeHandler.getEventFeeConfig(event);
  const feeValues = [
    fee.bridgeFee,
    fee.networkFee,
    fee.rsnRatio,
    fee.rsnRatioDivisor,
    fee.feeRatio,
    fee.feeRatioDivisor,
  ];
  if (
    feeValues.some((value) => typeof value !== 'bigint' || value < 0n) ||
    fee.rsnRatioDivisor < 1n ||
    fee.feeRatioDivisor < 1n
  )
    fail('fee configuration');

  const chainMinimum = ChainHandler.getInstance()
    .getChain(ZCASH_CHAIN)
    .getMinimumNativeToken();
  if (
    typeof chainMinimum !== 'bigint' ||
    chainMinimum < 0n ||
    chainMinimum > MAX_AMOUNT
  )
    fail('chain minimum');

  const payment = EventOrder.eventSinglePayment(event, chainMinimum, fee);
  if (
    payment.extra !== undefined ||
    payment.assets.tokens.length !== 0 ||
    payment.assets.nativeToken < 1n ||
    payment.assets.nativeToken > MAX_AMOUNT
  )
    fail('payment');
  const unwrapped = tokenMap.unwrapAmount(
    ZEC,
    payment.assets.nativeToken,
    ZCASH_CHAIN,
  );
  const wrapped = tokenMap.wrapAmount(ZEC, unwrapped.amount, ZCASH_CHAIN);
  if (
    unwrapped.decimals !== 8 ||
    unwrapped.amount !== payment.assets.nativeToken ||
    wrapped.decimals !== 8 ||
    wrapped.amount !== payment.assets.nativeToken
  )
    fail('token conversion');

  return Object.freeze({
    fee: Object.freeze(feeValues.map(String)),
    token,
    chainMinimum: chainMinimum.toString(),
    payment: JSON.stringify([
      payment.address,
      payment.assets.nativeToken.toString(),
    ]),
  });
};

// Shared derivation for payment and reward eligibility; authority issuance stays
// with the corresponding provider and its lifecycle-specific database checks.
export { capturePolicy as captureZcashEventPolicy };

const validateEvent = (
  confirmed: ConfirmedEventEntity | null,
  expectedId: string,
): { event: EventTrigger; fingerprint: EventFingerprint } => {
  if (!confirmed?.eventData) fail('missing event');
  const event = EventSerializer.fromConfirmedEntity(confirmed);
  if (
    confirmed.id !== expectedId ||
    confirmed.status !== EventStatus.inPayment ||
    confirmed.eventData.eventId !== expectedId ||
    EventSerializer.getId(event) !== expectedId ||
    event.toChain !== ZCASH_CHAIN ||
    event.targetChainTokenId !== ZEC
  )
    fail('event binding');
  return { event, fingerprint: fingerprintEvent(confirmed) };
};

export function assertZcashEventPaymentSnapshot(
  value: unknown,
): asserts value is ZcashEventPaymentSnapshot {
  if (
    value === null ||
    typeof value !== 'object' ||
    !issuedSnapshots.has(value)
  )
    fail('unknown snapshot');
}

export class ZcashEventPaymentAuthority {
  constructor(private readonly dataSource: DataSource) {
    if (!(dataSource instanceof DataSource) || !dataSource.isInitialized)
      fail('data source');
  }

  private async read(
    eventId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ConfirmedEventEntity | null> {
    return manager.getRepository(ConfirmedEventEntity).findOne({
      relations: ['eventData'],
      where: { id: eventId },
    });
  }

  async capture(eventId: string): Promise<ZcashEventPaymentSnapshot> {
    if (!/^[0-9a-f]{64}$/.test(eventId)) fail('event id');
    const initial = validateEvent(await this.read(eventId), eventId);
    const capturedEvent = Object.freeze({ ...initial.event });
    const policy = capturePolicy(capturedEvent);
    const payment = JSON.parse(policy.payment) as [string, string];
    const payments = Object.freeze([
      freezePayment({
        address: payment[0],
        assets: { nativeToken: BigInt(payment[1]), tokens: [] },
      }),
    ]) as unknown as PaymentOrder;

    const assertPolicyCurrent = (): void => {
      if (!same(capturePolicy(capturedEvent), policy)) fail('policy changed');
    };
    const assertStored = async (manager: EntityManager): Promise<void> => {
      const current = validateEvent(await this.read(eventId, manager), eventId);
      if (!same(current.fingerprint, initial.fingerprint))
        fail('stored event changed');
    };
    const assertCurrent = async (): Promise<void> => {
      assertPolicyCurrent();
      await assertStored(this.dataSource.manager);
      assertPolicyCurrent();
    };
    const assertStoredEvent = async (
      manager: EntityManager,
      suppliedEventId: string,
    ): Promise<void> => {
      if (manager.connection !== this.dataSource) fail('data source mismatch');
      if (suppliedEventId !== eventId) fail('event id mismatch');
      await assertStored(manager);
      const f = initial.fingerprint;
      const result = await manager.getRepository(EventTriggerEntity).update(
        {
          id: f.eventDataId,
          eventId: f.eventDataEventId,
          txId: f.eventDataTxId,
          height: f.height,
          fromChain: f.fromChain,
          toChain: f.toChain,
          fromAddress: f.fromAddress,
          toAddress: f.toAddress,
          amount: f.amount,
          bridgeFee: f.bridgeFee,
          networkFee: f.networkFee,
          sourceChainTokenId: f.sourceChainTokenId,
          targetChainTokenId: f.targetChainTokenId,
          sourceTxId: f.sourceTxId,
          sourceChainHeight: f.sourceChainHeight,
          sourceBlockId: f.sourceBlockId,
          WIDsHash: f.WIDsHash,
          WIDsCount: f.WIDsCount,
        },
        { id: f.eventDataId },
      );
      if (result.affected !== 1) fail('stored event changed');
    };

    const snapshot = Object.freeze({
      eventId,
      payments,
      assertCurrent,
      assertPolicyCurrent,
      assertStoredEvent,
    });
    issuedSnapshots.add(snapshot);
    return snapshot;
  }
}
