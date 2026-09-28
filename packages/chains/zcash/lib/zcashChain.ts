import {
  AbstractChain,
  PaymentTransaction,
  SigningStatus,
  TransactionType,
  type BlockInfo,
  type ChainConfigs,
  type PaymentOrder,
  type TransactionAssetBalance,
  type ValidityStatus,
} from '@rosen-chains/abstract-chain';
import type {
  NativeInspectionProvider,
  ZcashRpcRosenExtractorOptions,
} from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  serializeZcashTransaction,
  ZcashGuardEvidenceError,
  ZcashGuardRosenExtractor,
} from '@rosen-chains/zcash-event';
import {
  MAX_ZATOSHIS,
  ZcashPaymentEvidence,
  ZcashPaymentEvidenceError,
  ZcashTransaction,
  type NativePaymentProvider,
  type ZcashSourcePolicy,
} from '@rosen-chains/zcash-payment';

import {
  ZcashPaymentGenerator,
} from './zcashGeneration.js';
import type { ZcashPaymentPlannerOptions } from './paymentPlanner.js';
import {
  ZcashNetwork,
  type ZcashChainSource,
  type ZcashNetworkTransaction,
  type ZcashSubmissionGuard,
  type ZcashTransactionObservation,
} from './zcashNetwork.js';

const UINT32_MAX = 0xffff_ffff;
const EXPLICIT_INVALID_EVIDENCE = new Set([
  'unavailable_prevout',
  'expiry_policy',
  'insufficient_confirmations',
  'unsupported_coinbase',
]);

export class ZcashChainError extends Error {
  constructor(readonly code: string) {
    super(`Zcash chain ${code} failure`);
    this.name = 'ZcashChainError';
  }
}

export interface ZcashChainOptions
  extends Omit<ZcashPaymentPlannerOptions, 'reserveAddress' | 'source'> {
  readonly source: ZcashChainSource;
  readonly configs: ChainConfigs;
  readonly tokens: TokenMap;
  readonly logger?: ZcashRpcRosenExtractorOptions['logger'];
  readonly storeRawData?: boolean;
  readonly maxMempoolTransactions?: number;
}

function reject(code: string): never {
  throw new ZcashChainError(code);
}

function uint(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > UINT32_MAX ||
    Object.is(value, -0)
  ) reject('configuration');
  return value;
}

function copyPolicy(policy: ZcashSourcePolicy): ZcashSourcePolicy {
  if (!policy || typeof policy !== 'object' || !Array.isArray(policy.branches))
    reject('configuration');
  return Object.freeze({
    network: policy.network,
    genesisHash: policy.genesisHash,
    sourceId: policy.sourceId,
    branches: Object.freeze(
      Array.from(policy.branches, (branch) =>
        Object.freeze({ height: branch.height, branchId: branch.branchId }),
      ),
    ),
    minimumConfirmations: policy.minimumConfirmations,
    maximumExpiryDelta: policy.maximumExpiryDelta,
  });
}

function copySource(source: ZcashChainSource): ZcashChainSource {
  const result = {} as ZcashChainSource;
  const methods = [
    'getGenesisHash',
    'getBlockchainInfo',
    'getAddressUtxos',
    'getTxOut',
    'getBlockHash',
    'getTransaction',
    'getBlock',
    'getUnboundTransaction',
    'getMempoolEntries',
    'sendRawTransaction',
  ] as const;
  for (const method of methods) {
    if (typeof source?.[method] !== 'function') reject('configuration');
    Object.defineProperty(result, method, {
      value: source[method].bind(source),
      enumerable: true,
    });
  }
  return Object.freeze(result);
}

function copyConfigs(configs: ChainConfigs): ChainConfigs {
  if (!configs || typeof configs !== 'object') reject('configuration');
  const confirmations = configs.confirmations;
  const addresses = configs.addresses;
  if (
    typeof configs.fee !== 'bigint' ||
    configs.fee < 0n ||
    configs.fee > BigInt(MAX_ZATOSHIS) ||
    !confirmations ||
    !addresses ||
    typeof configs.rwtId !== 'string'
  ) reject('configuration');
  const copiedConfirmations = Object.freeze({
    observation: uint(confirmations.observation),
    payment: uint(confirmations.payment),
    cold: uint(confirmations.cold),
    manual: uint(confirmations.manual),
    arbitrary: uint(confirmations.arbitrary),
  });
  const copiedAddresses = Object.freeze({
    lock: addresses.lock,
    cold: addresses.cold,
    permit: addresses.permit,
    fraud: addresses.fraud,
  });
  if (Object.values(copiedAddresses).some((value) => typeof value !== 'string'))
    reject('configuration');
  return Object.freeze({
    fee: configs.fee,
    confirmations: copiedConfirmations,
    addresses: copiedAddresses,
    rwtId: configs.rwtId,
  });
}

function branchAt(policy: ZcashSourcePolicy, height: number): string {
  uint(height);
  let result = policy.branches[0]?.branchId;
  if (typeof result !== 'string') reject('configuration');
  for (const branch of policy.branches) {
    if (branch.height > height) break;
    result = branch.branchId;
  }
  return result;
}

/**
 * Concrete transparent Zcash adapter. Source observations authorize neither
 * signing nor submission; those operations belong to the guard coordinator.
 */
export class ZcashChain extends AbstractChain<ZcashNetworkTransaction> {
  readonly CHAIN = 'zcash';
  readonly NATIVE_TOKEN_ID = 'zec';
  protected extractor: ZcashGuardRosenExtractor;

  readonly #native: NativePaymentProvider;
  readonly #inspector: NativeInspectionProvider;
  readonly #policy: ZcashSourcePolicy;
  readonly #reserve: string;
  readonly #feeFloor: bigint;
  readonly #maximumFee: bigint;
  readonly #minimumOutput: bigint;
  readonly #generator: ZcashPaymentGenerator;
  readonly #evidence: ZcashPaymentEvidence;
  readonly #zcashNetwork: ZcashNetwork;

  constructor(options: ZcashChainOptions) {
    if (!options || typeof options !== 'object' || !(options.tokens instanceof TokenMap))
      reject('configuration');
    const source = copySource(options.source);
    const policy = copyPolicy(options.policy);
    const configs = copyConfigs(options.configs);
    const reserveAddress = configs.addresses.lock;
    const minimumOutputZat = options.minimumOutputZat ?? 1n;
    const network = new ZcashNetwork({
      source,
      policy,
      inspector: options.inspector,
      maxUtxos: options.maxUtxos,
      maxAgeMs: options.maxAgeMs,
      now: options.now,
      maxMempoolTransactions: options.maxMempoolTransactions,
    });
    const plannerOptions: ZcashPaymentPlannerOptions & { tokens: TokenMap } = {
      source,
      policy,
      native: options.native,
      inspector: options.inspector,
      reserveAddress,
      reserveCompressedPubkeyHex: options.reserveCompressedPubkeyHex,
      feeFloorZat: options.feeFloorZat,
      maximumFeeZat: options.maximumFeeZat,
      expiryDelta: options.expiryDelta,
      minimumOutputZat,
      maxUtxos: options.maxUtxos,
      maxAgeMs: options.maxAgeMs,
      now: options.now,
      tokens: options.tokens,
    };
    const generator = new ZcashPaymentGenerator(plannerOptions);
    const evidence = new ZcashPaymentEvidence(source, options.inspector, policy);
    super(network, configs, options.tokens, options.logger);

    if (
      typeof options.feeFloorZat !== 'bigint' ||
      typeof options.maximumFeeZat !== 'bigint' ||
      typeof minimumOutputZat !== 'bigint' ||
      options.feeFloorZat < 0n ||
      options.maximumFeeZat < options.feeFloorZat ||
      options.maximumFeeZat > BigInt(MAX_ZATOSHIS) ||
      minimumOutputZat < 1n ||
      minimumOutputZat > BigInt(MAX_ZATOSHIS)
    ) reject('configuration');

    this.#native = Object.freeze({
      construct: options.native.construct.bind(options.native),
      digest: options.native.digest.bind(options.native),
      finalize: options.native.finalize.bind(options.native),
      ...(typeof options.native.orchardPrepare === 'function' &&
          typeof options.native.orchardVerify === 'function' &&
          typeof options.native.orchardFinalize === 'function' &&
          typeof options.native.orchardVerifySigned === 'function' ? {
        orchardPrepare: options.native.orchardPrepare.bind(options.native),
        orchardVerify: options.native.orchardVerify.bind(options.native),
        orchardFinalize: options.native.orchardFinalize.bind(options.native),
        orchardVerifySigned: options.native.orchardVerifySigned.bind(options.native),
      } : {}),
    });
    this.#inspector = Object.freeze({
      inspect: options.inspector.inspect.bind(options.inspector),
    });
    this.#policy = policy;
    this.#reserve = reserveAddress;
    this.#feeFloor = options.feeFloorZat;
    this.#maximumFee = options.maximumFeeZat;
    this.#minimumOutput = minimumOutputZat;
    this.#generator = generator;
    this.#evidence = evidence;
    this.#zcashNetwork = network;
    this.extractor = new ZcashGuardRosenExtractor({
      network: policy.network,
      lockAddress: reserveAddress,
      tokens: options.tokens,
      inspector: this.#inspector,
      branchIdAtHeight: (height) => branchAt(policy, height),
      logger: options.logger,
      storeRawData: options.storeRawData,
    });
  }

  protected serializeTx = serializeZcashTransaction;

  #inspect(transaction: PaymentTransaction, signingStatus?: SigningStatus): ZcashTransaction {
    if (!(transaction instanceof PaymentTransaction)) reject('transaction');
    const model = ZcashTransaction.inspectProposalJson(
      transaction.toJson(),
      this.#native,
      this.#inspector,
    );
    const intent = model.getIntent();
    if (
      intent.txType !== TransactionType.payment ||
      model.txType !== TransactionType.payment ||
      intent.network !== this.#policy.network ||
      intent.reserveAddress !== this.#reserve
    ) reject('transaction_context');
    if (
      signingStatus !== undefined &&
      (model.getSignedHex() !== undefined) !== (signingStatus === SigningStatus.Signed)
    ) reject('signing_status');
    return model;
  }

  #wrapExact(amount: bigint): bigint {
    const wrapped = this.tokenMap.wrapAmount('zec', amount, 'zcash');
    const unwrapped = this.tokenMap.unwrapAmount('zec', wrapped.amount, 'zcash');
    if (
      wrapped.amount !== amount ||
      wrapped.decimals !== 8 ||
      unwrapped.amount !== amount ||
      unwrapped.decimals !== 8
    ) reject('token_conversion');
    return wrapped.amount;
  }

  #feeIsValid(model: ZcashTransaction): boolean {
    const intent = model.getIntent();
    const digest = model.getDigest();
    const paymentTotal = intent.payments.reduce(
      (sum, payment) => sum + payment.assets.nativeToken,
      0n,
    );
    const change = intent.input.amountZat - paymentTotal - intent.feeZat;
    const conventional = BigInt(digest.zip317_conventional_fee_zat);
    const requiredFee = conventional > this.#feeFloor ? conventional : this.#feeFloor;
    return (
      BigInt(digest.actual_fee_zat) === intent.feeZat &&
      intent.payments.every(
        (payment) => payment.assets.nativeToken >= this.#minimumOutput,
      ) &&
      intent.feeZat >= requiredFee &&
      intent.feeZat <= this.#maximumFee &&
      change >= 0n &&
      (change === 0n ||
        (change >= this.#minimumOutput && intent.feeZat === requiredFee))
    );
  }

  generateMultipleTransactions = async (
    eventId: string,
    txType: TransactionType,
    order: PaymentOrder,
    unsignedTransactions: PaymentTransaction[],
    serializedSignedTransactions: string[],
    ...extra: unknown[]
  ): Promise<PaymentTransaction[]> =>
    this.#generator.generateMultipleTransactions(
      eventId,
      txType,
      order,
      unsignedTransactions,
      serializedSignedTransactions,
      ...extra,
    );

  /** Fee is included in output accounting so native conservation remains exact. */
  getTransactionAssets = async (
    transaction: PaymentTransaction,
  ): Promise<TransactionAssetBalance> => {
    const model = this.#inspect(transaction);
    if (!this.#feeIsValid(model)) reject('fee');
    const input = this.#wrapExact(model.getIntent().input.amountZat);
    return {
      inputAssets: { nativeToken: input, tokens: [] },
      outputAssets: { nativeToken: input, tokens: [] },
    };
  };

  extractTransactionOrder = (transaction: PaymentTransaction): PaymentOrder =>
    this.#inspect(transaction).extractPaymentOrder().map((payment) => ({
      address: payment.address,
      assets: {
        nativeToken: this.#wrapExact(payment.assets.nativeToken),
        tokens: [],
      },
    }));

  verifyTransactionFee = async (transaction: PaymentTransaction): Promise<boolean> =>
    this.#feeIsValid(this.#inspect(transaction));

  verifyNoTokenBurned = async (transaction: PaymentTransaction): Promise<boolean> => {
    this.#inspect(transaction);
    return true;
  };

  verifyTransactionExtraConditions = (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.UnSigned,
  ): boolean => {
    try {
      const model = this.#inspect(transaction, signingStatus);
      return this.#feeIsValid(model);
    } catch (error) {
      if (error instanceof ZcashChainError) return false;
      throw error;
    }
  };

  override verifyLockTransactionExtraConditions = async (
    transaction: ZcashNetworkTransaction,
    block: BlockInfo,
  ): Promise<boolean> => {
    const candidate = transaction as Partial<{
      txid: string;
      blockhash: string;
      height: number;
    }>;
    const transactionIds = (block as Partial<{ transactionIds: string[] }>).transactionIds;
    if (
      candidate.blockhash !== block.hash ||
      candidate.height !== block.height ||
      !Array.isArray(transactionIds) ||
      typeof candidate.txid !== 'string' ||
      !transactionIds.includes(candidate.txid)
    ) throw new ZcashGuardEvidenceError('identity');
    return true;
  };

  isTxValid = async (
    transaction: PaymentTransaction,
    signingStatus: SigningStatus = SigningStatus.Signed,
  ): Promise<ValidityStatus> => {
    let model: ZcashTransaction;
    try {
      model = this.#inspect(transaction, signingStatus);
      if (!this.#feeIsValid(model))
        return {
          isValid: false,
          details: { reason: 'fee or output policy mismatch', unexpected: true },
        };
      await this.#evidence.check(model);
      return { isValid: true, details: undefined };
    } catch (error) {
      if (error instanceof ZcashChainError)
        return {
          isValid: false,
          details: { reason: error.code, unexpected: true },
        };
      if (
        error instanceof ZcashPaymentEvidenceError &&
        EXPLICIT_INVALID_EVIDENCE.has(error.code)
      )
        return {
          isValid: false,
          details: { reason: error.code, unexpected: false },
        };
      throw error;
    }
  };

  signTransaction = async (
    _transaction: PaymentTransaction,
    _requiredSign: number,
  ): Promise<PaymentTransaction> => {
    throw new ZcashChainError('signing_requires_guard_coordinator');
  };

  isTransactionInSign = async (
    _transaction: PaymentTransaction,
  ): Promise<boolean> => {
    throw new ZcashChainError('signing_requires_guard_coordinator');
  };

  submitTransaction = async (
    transaction: PaymentTransaction,
    hook?: ZcashSubmissionGuard,
  ): Promise<void> => {
    const model = this.#inspect(transaction, SigningStatus.Signed);
    if (!this.#feeIsValid(model)) reject('fee');
    const signedHex = model.getSignedHex();
    if (signedHex === undefined) reject('signing_status');
    await this.#evidence.check(model);
    await this.#zcashNetwork.submitTransaction(signedHex, hook, Boolean(model.getIntent().orchard));
  };

  observeTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<ZcashTransactionObservation> => {
    const model = this.#inspect(transaction, SigningStatus.Signed);
    if (!this.#feeIsValid(model)) reject('fee');
    const signedHex = model.getSignedHex();
    if (signedHex === undefined) reject('signing_status');
    return this.#zcashNetwork.observeSignedTransaction(model.txId, signedHex);
  };

  isTxInMempool = async (transactionId: string): Promise<boolean> =>
    (await this.#zcashNetwork.getMempoolTransactions()).some(
      (transaction) => transaction.txid === transactionId,
    );

  getMinimumNativeToken = (): bigint => this.#minimumOutput;

  PaymentTransactionFromJson = (jsonString: string): PaymentTransaction => {
    const model = ZcashTransaction.inspectProposalJson(
      jsonString,
      this.#native,
      this.#inspector,
    );
    return this.#inspect(model);
  };

  rawTxToPaymentTransaction = async (
    rawTxJsonString: string,
  ): Promise<PaymentTransaction> => {
    if (typeof rawTxJsonString !== 'string' || rawTxJsonString.length === 0)
      reject('transaction');
    const model = rawTxJsonString.startsWith('{')
      ? ZcashTransaction.inspectProposalJson(
          rawTxJsonString,
          this.#native,
          this.#inspector,
        )
      : ZcashTransaction.inspectProposalBytes(
          rawTxJsonString,
          this.#native,
          this.#inspector,
        );
    return this.#inspect(model);
  };

  override getChainConfigs = (): ChainConfigs => copyConfigs(this.configs);

  verifyPaymentTransaction = async (
    transaction: PaymentTransaction,
  ): Promise<boolean> => {
    try {
      return this.#feeIsValid(this.#inspect(transaction));
    } catch (error) {
      if (error instanceof ZcashChainError) return false;
      throw error;
    }
  };
}
