import { ErgoBox, Transaction } from 'ergo-lib-wasm-nodejs';
import { isEqual } from 'lodash-es';
import { createHash } from 'node:crypto';

import { DataSource, EntityManager } from '@rosen-bridge/extended-typeorm';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import {
  ConfirmationStatus,
  PaymentOrder,
  PaymentTransaction,
  SigningStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ErgoChain, ErgoTransaction } from '@rosen-chains/ergo';

import { DatabaseAction } from '../db/databaseAction';
import { ConfirmedEventEntity } from '../db/entities/confirmedEventEntity';
import EventBoxes from '../event/eventBoxes';
import EventOrder from '../event/eventOrder';
import EventSerializer from '../event/eventSerializer';
import MinimumFeeHandler from '../handlers/minimumFeeHandler';
import { EventStatus } from '../utils/constants';
import { captureZcashEventPolicy } from './zcashEventPaymentAuthority';

const issued = new WeakSet<object>();
const hex32 = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const fail = (reason: string): never => {
  throw Error(`Invalid spent-event recovery authority: ${reason}`);
};
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const sha256 = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

interface StoredSpentEvent {
  eventId: string;
  eventTxId: string;
  paymentTxId: string;
  rewardTxId: string;
  rewardBlockId: string;
  rewardHeight: number;
  raw: Record<string, unknown>;
  event: ReturnType<typeof EventSerializer.fromConfirmedEntity>;
}

export interface ZcashSpentEventRecoverySnapshot {
  readonly eventId: string;
  readonly paymentTxId: string;
  readonly rewardTxId: string;
  readonly rewardBlockId: string;
  readonly rewardHeight: number;
  readonly rewardTxJson: string;
  readonly rewardTxJsonSha256: string;
  readonly eventContextJson: string;
  readonly payments: PaymentOrder;
  readonly requiredConfirmations: number;
  assertPolicyCurrent(): void;
  assertStoredEvent(manager: EntityManager, eventId: string): Promise<void>;
  assertChainCurrent(): Promise<void>;
  assertCurrent(): Promise<void>;
}

export type ZcashSpentRewardOrderSource = (
  event: StoredSpentEvent['event'],
  eventTxId: string,
  paymentTxId: string,
) => Promise<PaymentOrder>;

// Operator wiring must derive this order from the same trusted event database
// and guard configuration as normal EventOrder.createEventRewardOrder. A value
// derived from the untrusted reward candidate does not satisfy this contract.

export interface ZcashSpentRewardChain {
  decodeReward(rewardTxJson: string): PaymentTransaction;
  verifySignedPaymentTransaction(
    transaction: PaymentTransaction,
  ): Promise<boolean>;
  verifyTransactionExtraConditions(
    transaction: PaymentTransaction,
    signingStatus: SigningStatus,
  ): boolean;
  observeCanonicalReward(
    txId: string,
    blockId: string,
    height: number,
  ): Promise<{
    signedHex: string;
    txId: string;
    selectedBlockId: string;
    selectedHeight: number;
  }>;
  extractSignedTransactionOrder(serializedTransaction: string): PaymentOrder;
  getTxConfirmationStatus(
    txId: string,
    type: TransactionType,
  ): Promise<ConfirmationStatus>;
  getTxRequiredConfirmation(type: TransactionType): number;
}

export interface ErgoSelectedChainSource {
  getSelectedBlock(height: number): Promise<{
    blockId: string;
    height: number;
  }>;
}

export const createErgoNodeSelectedChainSource = (
  baseUrl: string,
): ErgoSelectedChainSource => ({
  getSelectedBlock: async (height) => {
    if (!Number.isSafeInteger(height) || height < 0)
      fail('selected-chain height');
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/nipopow/popowHeaderByHeight/${height}`,
    );
    if (!response.ok) fail('selected-chain node response');
    const selected = (await response.json()) as {
      header?: { id?: unknown; height?: unknown };
    };
    const header = selected.header ?? fail('selected-chain node header');
    const { id, height: selectedHeight } = header;
    if (!hex32(id)) return fail('selected-chain node header');
    if (
      typeof selectedHeight !== 'number' ||
      !Number.isSafeInteger(selectedHeight)
    )
      return fail('selected-chain node header');
    return {
      blockId: id,
      height: selectedHeight,
    };
  },
});

export const createZcashSpentRewardChain = (
  chain: ErgoChain,
  selectedChain: ErgoSelectedChainSource,
): ZcashSpentRewardChain => ({
  decodeReward: (rewardTxJson) => ErgoTransaction.fromJson(rewardTxJson),
  verifySignedPaymentTransaction: async (transaction) => {
    try {
      const signed = Transaction.sigma_parse_bytes(transaction.txBytes);
      const ergoTransaction = transaction as ErgoTransaction;
      if (signed.id().to_str() !== transaction.txId) return false;
      const inputs = signed.inputs();
      if (inputs.len() !== ergoTransaction.inputBoxes.length) return false;
      for (let index = 0; index < inputs.len(); index++) {
        const storedBoxId = ErgoBox.sigma_parse_bytes(
          ergoTransaction.inputBoxes[index],
        )
          .box_id()
          .to_str();
        if (inputs.get(index).box_id().to_str() !== storedBoxId) return false;
      }
      const dataInputs = signed.data_inputs();
      if (dataInputs.len() !== ergoTransaction.dataInputs.length) return false;
      for (let index = 0; index < dataInputs.len(); index++) {
        const storedBoxId = ErgoBox.sigma_parse_bytes(
          ergoTransaction.dataInputs[index],
        )
          .box_id()
          .to_str();
        if (dataInputs.get(index).box_id().to_str() !== storedBoxId)
          return false;
      }
      return true;
    } catch {
      return false;
    }
  },
  verifyTransactionExtraConditions: (transaction, signingStatus) =>
    chain.verifyTransactionExtraConditions(transaction, signingStatus),
  observeCanonicalReward: async (txId, blockId, height) => {
    const [signedHex, selected] = await Promise.all([
      chain.getTransaction(txId, blockId),
      selectedChain.getSelectedBlock(height),
    ]);
    const signed = Transaction.sigma_parse_bytes(Buffer.from(signedHex, 'hex'));
    return {
      signedHex,
      txId: signed.id().to_str(),
      selectedBlockId: selected.blockId,
      selectedHeight: selected.height,
    };
  },
  extractSignedTransactionOrder: (serializedTransaction) =>
    chain.extractSignedTransactionOrder(serializedTransaction),
  getTxConfirmationStatus: (txId, type) =>
    chain.getTxConfirmationStatus(txId, type),
  getTxRequiredConfirmation: (type) => chain.getTxRequiredConfirmation(type),
});

export const createCanonicalZcashSpentRewardOrderSource =
  (source: DataSource): ZcashSpentRewardOrderSource =>
  async (event, eventTxId, paymentTxId) => {
    if (DatabaseAction.getInstance().dataSource !== source)
      fail('canonical reward order data source');
    const eventWIDs = await EventBoxes.getEventWIDs(event);
    return EventOrder.createEventRewardOrder(
      event,
      eventTxId,
      MinimumFeeHandler.getEventFeeConfig(event),
      paymentTxId,
      eventWIDs,
    );
  };

export function assertZcashSpentEventRecoverySnapshot(
  value: unknown,
): asserts value is ZcashSpentEventRecoverySnapshot {
  if (value === null || typeof value !== 'object' || !issued.has(value))
    fail('unknown snapshot');
}

export class ZcashSpentEventRecoveryAuthority {
  constructor(
    private readonly source: DataSource,
    private readonly ergoChain: ZcashSpentRewardChain,
    private readonly expectedRewardOrder: ZcashSpentRewardOrderSource,
  ) {
    if (!(source instanceof DataSource) || !source.isInitialized)
      fail('data source');
  }

  private async read(
    manager: EntityManager,
    eventId: string,
    paymentTxId: string,
  ): Promise<StoredSpentEvent> {
    const confirmed = await manager
      .getRepository(ConfirmedEventEntity)
      .findOne({ where: { id: eventId }, relations: ['eventData'] });
    if (!confirmed?.eventData) return fail('missing event');
    const data = confirmed.eventData;
    const event = EventSerializer.fromConfirmedEntity(confirmed);
    if (
      confirmed.status !== EventStatus.inPayment ||
      confirmed.id !== eventId ||
      data.eventId !== eventId ||
      EventSerializer.getId(event) !== eventId ||
      event.toChain !== 'zcash' ||
      event.targetChainTokenId !== 'zec' ||
      data.result !== 'successful' ||
      data.paymentTxId !== paymentTxId ||
      !hex32(data.spendTxId) ||
      !hex32(data.spendBlock) ||
      typeof data.spendHeight !== 'number' ||
      !Number.isSafeInteger(data.spendHeight) ||
      data.spendHeight < 0
    )
      return fail('event binding');
    const matches = await manager
      .getRepository(EventTriggerEntity)
      .find({ where: { txId: data.txId } });
    if (matches.length !== 1 || matches[0].id !== data.id)
      fail('ambiguous trigger transaction');
    const raw = Object.fromEntries(
      Object.keys(data)
        .filter((key) => !['confirmedEvent', 'blockEntity'].includes(key))
        .sort()
        .map((key) => [key, (data as unknown as Record<string, unknown>)[key]]),
    );
    return {
      eventId,
      eventTxId: data.txId,
      paymentTxId,
      rewardTxId: data.spendTxId,
      rewardBlockId: data.spendBlock,
      rewardHeight: data.spendHeight,
      raw,
      event,
    };
  }

  private async validateReward(
    stored: StoredSpentEvent,
    rewardTxJson: string,
    frozenExpectedOrder?: PaymentOrder,
  ): Promise<{ payments: PaymentOrder; requiredConfirmations: number }> {
    let candidate: PaymentTransaction;
    try {
      candidate = this.ergoChain.decodeReward(rewardTxJson);
    } catch {
      return fail('reward encoding');
    }
    if (
      candidate.toJson() !== rewardTxJson ||
      candidate.network !== 'ergo' ||
      candidate.txType !== TransactionType.reward ||
      candidate.eventId !== stored.eventId ||
      candidate.txId !== stored.rewardTxId ||
      !(await this.ergoChain.verifySignedPaymentTransaction(candidate)) ||
      !this.ergoChain.verifyTransactionExtraConditions(
        candidate,
        SigningStatus.Signed,
      )
    )
      fail('reward candidate');
    const expected =
      frozenExpectedOrder ??
      (await this.expectedRewardOrder(
        stored.event,
        stored.eventTxId,
        stored.paymentTxId,
      ));
    const candidateSignedHex = Buffer.from(candidate.txBytes).toString('hex');
    const candidateOrder =
      this.ergoChain.extractSignedTransactionOrder(candidateSignedHex);
    if (!isEqual(candidateOrder, expected)) fail('reward order');
    const canonical = await this.ergoChain.observeCanonicalReward(
      stored.rewardTxId,
      stored.rewardBlockId,
      stored.rewardHeight,
    );
    if (
      canonical.txId !== stored.rewardTxId ||
      canonical.selectedBlockId !== stored.rewardBlockId ||
      canonical.selectedHeight !== stored.rewardHeight ||
      canonical.signedHex !== candidateSignedHex ||
      !isEqual(
        this.ergoChain.extractSignedTransactionOrder(canonical.signedHex),
        candidateOrder,
      ) ||
      (await this.ergoChain.getTxConfirmationStatus(
        stored.rewardTxId,
        TransactionType.reward,
      )) !== ConfirmationStatus.ConfirmedEnough
    )
      fail('canonical reward confirmation');
    return {
      payments: expected,
      requiredConfirmations: this.ergoChain.getTxRequiredConfirmation(
        TransactionType.reward,
      ),
    };
  }

  async capture(
    eventId: string,
    paymentTxId: string,
    rewardTxJson: string,
  ): Promise<ZcashSpentEventRecoverySnapshot> {
    if (!hex32(eventId) || !hex32(paymentTxId)) fail('request');
    const initial = await this.read(this.source.manager, eventId, paymentTxId);
    const checked = await this.validateReward(initial, rewardTxJson);
    const policy = captureZcashEventPolicy(initial.event);
    const [address, amount] = JSON.parse(policy.payment) as [string, string];
    const payments = Object.freeze([
      Object.freeze({
        address,
        assets: Object.freeze({
          nativeToken: BigInt(amount),
          tokens: Object.freeze([]),
        }),
      }),
    ]) as unknown as PaymentOrder;
    const eventContextJson = JSON.stringify({
      schema: 1,
      raw: initial.raw,
      policy,
      spentReward: {
        txId: initial.rewardTxId,
        blockId: initial.rewardBlockId,
        height: initial.rewardHeight,
        rewardTxJsonSha256: sha256(rewardTxJson),
        requiredConfirmations: checked.requiredConfirmations,
      },
    });
    const assertPolicyCurrent = () => {
      if (
        !same(captureZcashEventPolicy(initial.event), policy) ||
        this.ergoChain.getTxRequiredConfirmation(TransactionType.reward) !==
          checked.requiredConfirmations
      )
        fail('policy changed');
    };
    const assertStoredEvent = async (
      manager: EntityManager,
      expectedEventId: string,
    ) => {
      if (manager.connection !== this.source || expectedEventId !== eventId)
        fail('data source or event mismatch');
      const current = await this.read(manager, eventId, paymentTxId);
      if (!same(current.raw, initial.raw)) fail('stored trigger changed');
    };
    const assertCurrent = async () => {
      assertPolicyCurrent();
      const current = await this.read(
        this.source.manager,
        eventId,
        paymentTxId,
      );
      if (!same(current.raw, initial.raw)) fail('stored trigger changed');
      const currentReward = await this.validateReward(current, rewardTxJson);
      if (!isEqual(currentReward.payments, checked.payments))
        fail('reward order changed');
      assertPolicyCurrent();
    };
    const assertChainCurrent = async () => {
      assertPolicyCurrent();
      await this.validateReward(initial, rewardTxJson, checked.payments);
      assertPolicyCurrent();
    };
    const snapshot = Object.freeze({
      eventId,
      paymentTxId,
      rewardTxId: initial.rewardTxId,
      rewardBlockId: initial.rewardBlockId,
      rewardHeight: initial.rewardHeight,
      rewardTxJson,
      rewardTxJsonSha256: sha256(rewardTxJson),
      eventContextJson,
      payments,
      requiredConfirmations: checked.requiredConfirmations,
      assertPolicyCurrent,
      assertStoredEvent,
      assertChainCurrent,
      assertCurrent,
    });
    issued.add(snapshot);
    return snapshot;
  }
}
