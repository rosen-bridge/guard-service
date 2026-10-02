import config from 'config';

import {
  decodeAddress,
  encodeAddress,
  validateAddress,
} from '@rosen-bridge/address-codec';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  BCH,
  BCH_MAX_MONEY,
  BITCOIN_CASH_CHAIN,
  BitcoinCashConfigs,
  bchP2pkhScriptFromPublicKey,
} from '@rosen-chains/bitcoin-cash';
import { BitcoinCashRpcConfig } from '@rosen-chains/bitcoin-cash-rpc';

import { ChainConfigs as ContractConfigs } from '../types/contract';
import { rosenConfig } from './rosenConfig';

/** Read an operator-configured safe integer within inclusive bounds. */
const integer = (key: string, minimum: number, maximum: number): number => {
  const value = config.get<unknown>(key);
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    throw Error(`Invalid BCH integer config: ${key}`);
  return value;
};
/** Read nonempty bounded text without accepting surrounding whitespace. */
const text = (key: string, maximum = 256): string => {
  const value = config.get<unknown>(key);
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > maximum ||
    value !== value.trim()
  )
    throw Error(`Invalid BCH text config: ${key}`);
  return value;
};
/** Read exact native satoshis and enforce the configured monetary bounds. */
const satoshis = (key: string, minimum: bigint): bigint => {
  const raw = config.get<unknown>(key);
  if (
    !(typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0) &&
    !(typeof raw === 'string' && /^[1-9][0-9]{0,15}$/.test(raw))
  )
    throw Error(`Invalid exact BCH satoshi config: ${key}`);
  const value = BigInt(raw as number | string);
  if (value < minimum || value > BCH_MAX_MONEY)
    throw Error(`BCH satoshi config outside bounds: ${key}`);
  return value;
};
/** Recognize a nonzero canonical 32-byte asset identifier. */
const assetId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{64}$/.test(value) &&
  value !== '00'.repeat(32);
/** Freeze the validated operator policy and all nested objects in place. */
const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => freeze(item));
    Object.freeze(value);
  }
  return value;
};
/** Resolve an ordinary canonical mainnet contract address to locking bytes. */
const cashAddress = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value.startsWith('bitcoincash:') ||
    value !== value.toLowerCase()
  )
    throw Error('BCH contracts require canonical mainnet CashAddr');
  const script = encodeAddress(BITCOIN_CASH_CHAIN, value);
  if (
    !/^(76a914[0-9a-f]{40}88ac|a914[0-9a-f]{40}87)$/.test(script) ||
    decodeAddress(BITCOIN_CASH_CHAIN, script) !== value
  )
    throw Error('BCH contract address is not an ordinary canonical CashAddr');
  return script;
};

export interface BitcoinCashHealthPolicy {
  warnThreshold: bigint;
  criticalThreshold: bigint;
}

export interface LoadedBitcoinCashConfigs {
  chainConfigs: BitcoinCashConfigs;
  rpc: BitcoinCashRpcConfig;
  tssChainCode: string;
  derivationPath: number[];
  bitcoinCashContractConfig: ContractConfigs;
  health?: BitcoinCashHealthPolicy;
}

/** BCH policy is read only after explicit opt-in and initialized TokenMap. */
class GuardsBitcoinCashConfigs {
  private static loaded?: LoadedBitcoinCashConfigs;
  /** Read the explicit boolean opt-in without loading disabled-chain policy. */
  static get enabled(): boolean {
    if (!config.has('bitcoinCash.enabled')) return false;
    const enabled = config.get<unknown>('bitcoinCash.enabled');
    if (typeof enabled !== 'boolean')
      throw Error('bitcoinCash.enabled must be boolean');
    return enabled;
  }
  /** Read the independent boolean opt-in for native asset health checks. */
  static get healthEnabled(): boolean {
    if (!config.has('bitcoinCash.health.enabled')) return false;
    const enabled = config.get<unknown>('bitcoinCash.health.enabled');
    if (typeof enabled !== 'boolean')
      throw Error('bitcoinCash.health.enabled must be boolean');
    return enabled;
  }
  /** Validate and cache immutable contract, RPC, treasury and health policy. */
  static load = (tokens: TokenMap): LoadedBitcoinCashConfigs => {
    if (!this.enabled) throw Error('Bitcoin Cash is disabled');
    if (this.loaded) return this.loaded;
    if (text('bitcoinCash.chainNetwork') !== 'rpc')
      throw Error('Only BCHN RPC is supported');
    const url = text('bitcoinCash.rpc.url', 2048);
    const endpoint = new URL(url);
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.hash
    )
      throw Error('Invalid BCH RPC endpoint');
    const expectedChain = text('bitcoinCash.rpc.expectedChain');
    if (!['main', 'test', 'regtest'].includes(expectedChain))
      throw Error('Explicit BCH RPC chain identity required');
    const rpc: BitcoinCashRpcConfig = {
      url,
      expectedChain: expectedChain as BitcoinCashRpcConfig['expectedChain'],
      timeoutMs: integer('bitcoinCash.rpc.timeoutMs', 1, 60_000),
    };
    const hasUsername = config.has('bitcoinCash.rpc.username');
    const hasPassword = config.has('bitcoinCash.rpc.password');
    if (hasUsername !== hasPassword)
      throw Error('BCH RPC credentials must be paired');
    if (hasUsername)
      rpc.auth = {
        username: text('bitcoinCash.rpc.username', 1024),
        password: text('bitcoinCash.rpc.password', 1024),
      };
    const limits = {
      maxResponseBytes: 64_000_000,
      maxUtxos: 10_000,
      maxMempoolTransactions: 10_000,
      maxBlockTransactions: 100_000,
      walletHistoryPageSize: 500,
      maxWalletHistoryPages: 100,
    } as const;
    for (const [key, maximum] of Object.entries(limits))
      if (config.has(`bitcoinCash.rpc.${key}`))
        rpc[key as keyof typeof limits] = integer(
          `bitcoinCash.rpc.${key}`,
          1,
          maximum,
        );
    const aggregatedPublicKey = text('bitcoinCash.bankPublicKey', 66);
    const treasuryScript = bchP2pkhScriptFromPublicKey(aggregatedPublicKey);
    const contract = rosenConfig.contractReader(BITCOIN_CASH_CHAIN);
    if (
      !contract ||
      !contract.addresses ||
      !contract.tokens ||
      cashAddress(contract.addresses.lock) !== treasuryScript
    )
      throw Error('BCH contract treasury does not match aggregate public key');
    if (cashAddress(contract.addresses.cold) === treasuryScript)
      throw Error('BCH cold address must differ from treasury');
    for (const key of [
      'WatcherTriggerEvent',
      'WatcherPermit',
      'Fraud',
      'Commitment',
      'guardSign',
    ] as const) {
      const address = contract.addresses[key];
      if (
        typeof address !== 'string' ||
        !address.length ||
        address.length > 16_384
      )
        throw Error('Missing BCH Ergo contract address');
      validateAddress('ergo', address);
    }
    if (
      !assetId(contract.tokens.RWTId) ||
      !assetId(contract.tokens.CleanupNFT) ||
      !Number.isSafeInteger(contract.cleanupConfirm) ||
      contract.cleanupConfirm < 1
    )
      throw Error('Invalid BCH contract token or cleanup configuration');
    const tokenSets = tokens
      .getConfig()
      .filter((set) => Object.hasOwn(set, BITCOIN_CASH_CHAIN));
    if (tokenSets.length !== 1)
      throw Error('Exactly one native BCH token mapping is required');
    const native = tokenSets[0][BITCOIN_CASH_CHAIN];
    const ergo = tokenSets[0].ergo;
    if (
      native.tokenId !== BCH ||
      native.type !== 'native' ||
      native.residency !== 'native' ||
      native.decimals !== 8 ||
      !ergo ||
      !assetId(ergo.tokenId) ||
      ergo.type !== 'EIP-004' ||
      ergo.residency !== 'wrapped' ||
      !Number.isSafeInteger(ergo.decimals) ||
      ergo.decimals < 0 ||
      ergo.decimals > 18
    )
      throw Error(
        'Native BCH mapping requires bch with eight decimals and an Ergo wrapped asset',
      );
    const derivationPath = config.get<unknown>('bitcoinCash.derivationPath');
    if (
      !Array.isArray(derivationPath) ||
      !derivationPath.length ||
      derivationPath.length > 10 ||
      derivationPath.some(
        (part) =>
          typeof part !== 'number' ||
          !Number.isSafeInteger(part) ||
          part < 0 ||
          part > 0x7fffffff,
      )
    )
      throw Error('Invalid BCH TSS derivation path');
    const confirmations: BitcoinCashConfigs['confirmations'] = {
      observation: integer(
        'bitcoinCash.confirmation.observation',
        1,
        1_000_000,
      ),
      payment: integer('bitcoinCash.confirmation.payment', 1, 1_000_000),
      cold: integer('bitcoinCash.confirmation.cold', 1, 1_000_000),
      manual: integer('bitcoinCash.confirmation.manual', 1, 1_000_000),
      arbitrary: integer('bitcoinCash.confirmation.arbitrary', 1, 1_000_000),
    };
    const chainConfigs: BitcoinCashConfigs = {
      fee: 0n,
      confirmations,
      addresses: {
        lock: contract.addresses.lock,
        cold: contract.addresses.cold,
        permit: contract.addresses.WatcherPermit,
        fraud: contract.addresses.Fraud,
      },
      rwtId: contract.tokens.RWTId,
      aggregatedPublicKey,
      feeRate: integer('bitcoinCash.feeRate', 1, 1_000_000),
      maxFee: satoshis('bitcoinCash.maxFee', 1n),
      minimumUtxoValue: satoshis('bitcoinCash.minimumUtxoValue', 546n),
      maxUtxoPages: integer('bitcoinCash.maxUtxoPages', 1, 100),
    };
    integer('balanceHandler.bitcoinCash.tokensPerIteration.rpc', 1, 10_000);
    for (const key of ['updateInterval', 'updateBatchInterval']) {
      const path = config.has(`balanceHandler.bitcoinCash.${key}`)
        ? `balanceHandler.bitcoinCash.${key}`
        : `balanceHandler.default.${key}`;
      integer(path, key === 'updateInterval' ? 1 : 0, 86_400);
    }
    let health: BitcoinCashHealthPolicy | undefined;
    if (this.healthEnabled) {
      /** Read an exact nonnegative native balance health threshold. */
      const threshold = (name: string): bigint => {
        const key = `bitcoinCash.health.${name}`;
        const value = config.get<unknown>(key);
        if (
          typeof value !== 'string' ||
          !/^(0|[1-9][0-9]{0,15})$/.test(value) ||
          BigInt(value) > BCH_MAX_MONEY
        )
          throw Error(`Invalid exact BCH health threshold: ${key}`);
        return BigInt(value);
      };
      health = {
        warnThreshold: threshold('warnThreshold'),
        criticalThreshold: threshold('criticalThreshold'),
      };
      if (health.criticalThreshold > health.warnThreshold)
        throw Error('BCH critical health threshold exceeds warning threshold');
    }
    this.loaded = freeze({
      chainConfigs,
      rpc,
      tssChainCode: text('bitcoinCash.tssChainCode'),
      derivationPath: [...derivationPath],
      bitcoinCashContractConfig: structuredClone(contract),
      health,
    });
    return this.loaded;
  };
  /** Return the validated contract only after successful registration. */
  static get bitcoinCashContractConfig(): ContractConfigs {
    if (!this.loaded)
      throw Error('BCH configuration requires initialized registration');
    return this.loaded.bitcoinCashContractConfig;
  }
  /** Return the immutable chain policy only after successful registration. */
  static get chainConfigs(): BitcoinCashConfigs {
    if (!this.loaded)
      throw Error('BCH configuration requires initialized registration');
    return this.loaded.chainConfigs;
  }
}

export default GuardsBitcoinCashConfigs;
