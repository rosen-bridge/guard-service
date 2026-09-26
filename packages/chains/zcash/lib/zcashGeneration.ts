import {PaymentTransaction, TransactionType, type PaymentOrder} from '@rosen-chains/abstract-chain';
import {TokenMap, type RosenAmount, type RosenTokens} from '@rosen-bridge/tokens';
import type {NativeInspectionProvider} from '@rosen-bridge/rosen-extractor';
import {ZcashTransaction, MAX_PAYMENT_OUTPUTS, MAX_ZATOSHIS, type NativePaymentProvider} from '@rosen-chains/zcash-payment';
import {ZcashPaymentPlanner, type ZcashPaymentPlannerOptions} from './paymentPlanner.js';

const MAX_ACTIVE = 5000;
export class ZcashGenerationError extends Error {
  constructor(readonly code: string) {super(`Zcash generation ${code} failure`); this.name = 'ZcashGenerationError';}
}
function reject(code: string): never {throw new ZcashGenerationError(code);}
function record(value: unknown, keys: string[], code: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) reject(code);
  return value as Record<string, unknown>;
}
function copyOrder(order: PaymentOrder): PaymentOrder {
  if (!Array.isArray(order) || order.length < 1 || order.length > MAX_PAYMENT_OUTPUTS) reject('payments');
  return Array.from(order, row => {
    const payment = record(row, row && Object.hasOwn(row, 'extra') ? ['address', 'assets', 'extra'] : ['address', 'assets'], 'payments');
    const assets = record(payment.assets, ['nativeToken', 'tokens'], 'payments');
    if (typeof payment.address !== 'string' || payment.extra !== undefined || !Array.isArray(assets.tokens) ||
        assets.tokens.length !== 0 || typeof assets.nativeToken !== 'bigint' || assets.nativeToken < 1n ||
        assets.nativeToken > BigInt(MAX_ZATOSHIS)) reject('payments');
    return {address: payment.address, assets: {nativeToken: assets.nativeToken, tokens: []}};
  });
}
function tokenFingerprint(config: RosenTokens): string {
  if (!Array.isArray(config)) reject('token_configuration');
  const matches = config.filter(set => Object.values(set).some(token => token.tokenId === 'zec'));
  if (matches.length !== 1) reject('token_configuration');
  const set = matches[0];
  if (set.zcash?.tokenId !== 'zec' || set.zcash.decimals !== 8 || set.ergo?.decimals !== 8 ||
      !/^[0-9a-f]{64}$/.test(set.ergo?.tokenId ?? '') || Object.values(set).some(token =>
        !Number.isSafeInteger(token.decimals) || token.decimals < 8 || token.decimals > 18)) reject('token_configuration');
  return JSON.stringify(Object.keys(set).sort().map(chain => [chain, set[chain].tokenId, set[chain].decimals]));
}

/** Converts the Rosen payment order and excludes active inputs; generation grants no signing approval. */
export class ZcashPaymentGenerator {
  readonly #planner: ZcashPaymentPlanner;
  readonly #native: NativePaymentProvider;
  readonly #inspector: NativeInspectionProvider;
  readonly #network: string;
  readonly #reserve: string;
  readonly #readConfig: () => RosenTokens;
  readonly #unwrap: (tokenId: string, amount: bigint, chain: string) => RosenAmount;
  readonly #wrap: (tokenId: string, amount: bigint, chain: string) => RosenAmount;
  readonly #register: (callback: () => void) => number;
  readonly #unregister: (id: number) => void;

  constructor(options: ZcashPaymentPlannerOptions & {tokens: TokenMap}) {
    if (!(options?.tokens instanceof TokenMap)) reject('token_configuration');
    this.#planner = new ZcashPaymentPlanner(options);
    this.#network = options.policy.network; this.#reserve = options.reserveAddress;
    this.#native = Object.freeze({construct: options.native.construct.bind(options.native),
      digest: options.native.digest.bind(options.native), finalize: options.native.finalize.bind(options.native),
      ...(typeof options.native.orchardPrepare === 'function' &&
          typeof options.native.orchardVerify === 'function' &&
          typeof options.native.orchardFinalize === 'function' &&
          typeof options.native.orchardVerifySigned === 'function' ? {
        orchardPrepare: options.native.orchardPrepare.bind(options.native),
        orchardVerify: options.native.orchardVerify.bind(options.native),
        orchardFinalize: options.native.orchardFinalize.bind(options.native),
        orchardVerifySigned: options.native.orchardVerifySigned.bind(options.native),
      } : {})});
    this.#inspector = Object.freeze({inspect: options.inspector.inspect.bind(options.inspector)});
    this.#readConfig = options.tokens.getRawConfig.bind(options.tokens);
    this.#unwrap = options.tokens.unwrapAmount.bind(options.tokens);
    this.#wrap = options.tokens.wrapAmount.bind(options.tokens);
    this.#register = options.tokens.registerCallback.bind(options.tokens);
    this.#unregister = options.tokens.unregisterCallback.bind(options.tokens);
    tokenFingerprint(this.#readConfig());
    Object.freeze(this);
  }

  async generateMultipleTransactions(eventId: string, txType: TransactionType, order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[], serializedSignedTransactions: string[], ...extra: unknown[]): Promise<ZcashTransaction[]> {
    if (txType !== TransactionType.payment || extra.length !== 0 ||
        typeof eventId !== 'string' || !/^[0-9a-f]{64}$/.test(eventId)) reject('unsupported_call');
    const payments = copyOrder(order);
    if (!Array.isArray(unsignedTransactions) || !Array.isArray(serializedSignedTransactions) ||
        unsignedTransactions.length > MAX_ACTIVE || serializedSignedTransactions.length > MAX_ACTIVE) reject('active_list');
    const signedBytes = Array.from(serializedSignedTransactions);
    const unsignedModels = Array.from(unsignedTransactions);
    const unsignedJson = unsignedModels.map(tx => {
      if (!(tx instanceof PaymentTransaction)) reject('active_encoding');
      try {return tx.toJson();} catch {reject('active_encoding');}
    });
    const fingerprint = tokenFingerprint(this.#readConfig());
    let changed = false;
    const callbackId = this.#register(() => {changed = true;});
    try {
      for (const payment of payments) {
        const wrappedAmount = payment.assets.nativeToken;
        const unwrapped = this.#unwrap('zec', wrappedAmount, 'zcash');
        const wrapped = this.#wrap('zec', unwrapped.amount, 'zcash');
        if (unwrapped.decimals !== 8 || unwrapped.amount !== wrappedAmount || wrapped.decimals !== 8 ||
            wrapped.amount !== wrappedAmount) reject('token_conversion');
        payment.assets.nativeToken = unwrapped.amount;
      }
      const forbidden = new Set<string>();
      const inspectActive = (encoded: unknown, signed: boolean): void => {
        let transaction: ZcashTransaction;
        try {
          if (typeof encoded !== 'string') reject('active_encoding');
          transaction = signed ? ZcashTransaction.inspectProposalBytes(encoded, this.#native, this.#inspector) :
            ZcashTransaction.inspectProposalJson(encoded, this.#native, this.#inspector);
        } catch {reject('active_encoding');}
        if ((transaction.getSignedHex() !== undefined) !== signed) reject('active_state');
        const intent = transaction.getIntent();
        if (intent.network !== this.#network || intent.reserveAddress !== this.#reserve) reject('active_context');
        forbidden.add(`${intent.input.txid}.${intent.input.index}`);
      };
      for (const json of unsignedJson) inspectActive(json, false);
      for (const bytes of signedBytes) inspectActive(bytes, true);
      if (changed || tokenFingerprint(this.#readConfig()) !== fingerprint) reject('token_configuration_changed');
      const result = await this.#planner.plan(eventId, txType, payments, [...forbidden]);
      if (changed || tokenFingerprint(this.#readConfig()) !== fingerprint) reject('token_configuration_changed');
      return [result.transaction];
    } finally {this.#unregister(callbackId);}
  }
}
