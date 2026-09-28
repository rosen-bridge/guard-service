import config from 'config';
import { ECDH } from 'node:crypto';
import { isAbsolute } from 'node:path';

import {
  createZcashAddressCodec,
  type ZcashNetwork,
} from '@rosen-bridge/address-codec-zcash';

const UINT32_MAX = 0xffff_ffff;
const UINT31_MAX = 0x7fff_ffff;
const MAX_TIMEOUT_MS = 2_147_483_647;
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const MAX_EXPIRY_HEIGHT = 499_999_999;
const MAX_ZATOSHIS = 2_100_000_000_000_000n;
const MAX_PATH_COMPONENTS = 32;
const MAX_TEXT_LENGTH = 4_096;

interface NativeExecutableConfig {
  readonly executablePath: string;
  readonly expectedSha256: string;
}

export interface ZcashGuardConfig {
  readonly enabled: true;
  readonly rpc: {
    readonly rpcUrl: string;
    readonly auth?: {
      readonly username: string;
      readonly password: string;
    };
    readonly timeoutMs: number;
    readonly maxResponseBytes: number;
  };
  readonly sourcePolicy: {
    readonly network: ZcashNetwork;
    readonly genesisHash: string;
    readonly sourceId: string;
    readonly branches: ReadonlyArray<{
      readonly height: number;
      readonly branchId: string;
    }>;
    readonly minimumConfirmations: number;
    readonly maximumExpiryDelta: number;
  };
  readonly native: NativeExecutableConfig;
  readonly inspector: NativeExecutableConfig;
  readonly chain: {
    readonly addresses: {
      readonly lock: string;
      readonly cold: string;
      readonly permit: string;
      readonly fraud: string;
    };
    readonly rwtId: string;
    readonly confirmations: {
      readonly observation: number;
      readonly payment: number;
      readonly cold: number;
      readonly manual: number;
      readonly arbitrary: number;
    };
    readonly fee: bigint;
  };
  readonly payment: {
    readonly feeFloorZat: bigint;
    readonly maximumFeeZat: bigint;
    readonly minimumOutputZat: bigint;
    readonly expiryDelta: number;
  };
  readonly signing: {
    readonly publicKey: string;
    readonly chainCode: string;
    readonly derivationPath: readonly number[];
    readonly effectiveThreshold: number;
    readonly protocolVersion: string;
    readonly maxObservationAgeMs: number;
  };
}

function invalid(path: string): never {
  throw new Error(`Invalid Zcash guard configuration at ${path}`);
}

function exactRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
  path = 'zcash',
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(path);
  }
  const result = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(result, key)) ||
    Object.keys(result).some((key) => !allowed.has(key))
  ) {
    invalid(path);
  }
  return result;
}

function textValue(
  value: unknown,
  path: string,
  maximum = MAX_TEXT_LENGTH,
): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum) {
    invalid(path);
  }
  return value;
}

function canonicalHex(value: unknown, length: number, path: string): string {
  if (
    typeof value !== 'string' ||
    value.length !== length ||
    !/^[0-9a-f]+$/.test(value)
  ) {
    invalid(path);
  }
  return value;
}

function uint(
  value: unknown,
  maximum: number,
  path: string,
  positive = false,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    Object.is(value, -0) ||
    value < (positive ? 1 : 0) ||
    value > maximum
  ) {
    invalid(path);
  }
  return value;
}

function zatoshis(value: unknown, path: string, positive = false): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(value)) {
    invalid(path);
  }
  const amount = BigInt(value);
  if (amount > MAX_ZATOSHIS || (positive && amount === 0n)) invalid(path);
  return amount;
}

function executable(value: unknown, path: string): NativeExecutableConfig {
  const item = exactRecord(
    value,
    ['executablePath', 'expectedSha256'],
    [],
    path,
  );
  const executablePath = textValue(
    item.executablePath,
    `${path}.executablePath`,
  );
  if (!isAbsolute(executablePath)) invalid(`${path}.executablePath`);
  return {
    executablePath,
    expectedSha256: canonicalHex(
      item.expectedSha256,
      64,
      `${path}.expectedSha256`,
    ),
  };
}

function rpcConfig(value: unknown): ZcashGuardConfig['rpc'] {
  const item = exactRecord(
    value,
    ['rpcUrl', 'timeoutMs', 'maxResponseBytes'],
    ['auth'],
    'zcash.rpc',
  );
  if (
    typeof item.rpcUrl !== 'string' ||
    !/^http:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?(?:\/[^?#\s]*)?$/.test(
      item.rpcUrl,
    )
  ) {
    invalid('zcash.rpc.rpcUrl');
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(item.rpcUrl);
  } catch {
    invalid('zcash.rpc.rpcUrl');
  }
  if (
    parsedUrl.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]'].includes(parsedUrl.hostname) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    invalid('zcash.rpc.rpcUrl');
  }

  let auth: ZcashGuardConfig['rpc']['auth'];
  if (item.auth !== undefined) {
    const rawAuth = exactRecord(
      item.auth,
      ['username', 'password'],
      [],
      'zcash.rpc.auth',
    );
    if (
      typeof rawAuth.username !== 'string' ||
      typeof rawAuth.password !== 'string' ||
      rawAuth.username.includes(':') ||
      rawAuth.username.length > 1_024 ||
      rawAuth.password.length > 1_024
    ) {
      invalid('zcash.rpc.auth');
    }
    auth = { username: rawAuth.username, password: rawAuth.password };
  }

  return {
    rpcUrl: item.rpcUrl,
    ...(auth === undefined ? {} : { auth }),
    timeoutMs: uint(
      item.timeoutMs,
      MAX_TIMEOUT_MS,
      'zcash.rpc.timeoutMs',
      true,
    ),
    maxResponseBytes: uint(
      item.maxResponseBytes,
      MAX_RESPONSE_BYTES,
      'zcash.rpc.maxResponseBytes',
      true,
    ),
  };
}

function sourcePolicy(value: unknown): ZcashGuardConfig['sourcePolicy'] {
  const item = exactRecord(
    value,
    [
      'network',
      'genesisHash',
      'sourceId',
      'branches',
      'minimumConfirmations',
      'maximumExpiryDelta',
    ],
    [],
    'zcash.sourcePolicy',
  );
  if (!['mainnet', 'testnet', 'regtest'].includes(item.network as string)) {
    invalid('zcash.sourcePolicy.network');
  }
  const network = item.network as ZcashNetwork;
  if (
    typeof item.sourceId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(item.sourceId)
  ) {
    invalid('zcash.sourcePolicy.sourceId');
  }
  if (
    !Array.isArray(item.branches) ||
    item.branches.length < 1 ||
    item.branches.length > 32
  ) {
    invalid('zcash.sourcePolicy.branches');
  }
  let previous = -1;
  const branches = item.branches.map((value, index) => {
    const branch = exactRecord(
      value,
      ['height', 'branchId'],
      [],
      `zcash.sourcePolicy.branches[${index}]`,
    );
    const height = uint(
      branch.height,
      UINT32_MAX,
      `zcash.sourcePolicy.branches[${index}].height`,
    );
    if (height <= previous || (index === 0 && height !== 0)) {
      invalid('zcash.sourcePolicy.branches');
    }
    previous = height;
    return {
      height,
      branchId: canonicalHex(
        branch.branchId,
        8,
        `zcash.sourcePolicy.branches[${index}].branchId`,
      ),
    };
  });
  return {
    network,
    genesisHash: canonicalHex(
      item.genesisHash,
      64,
      'zcash.sourcePolicy.genesisHash',
    ),
    sourceId: item.sourceId,
    branches,
    minimumConfirmations: uint(
      item.minimumConfirmations,
      UINT32_MAX,
      'zcash.sourcePolicy.minimumConfirmations',
      true,
    ),
    maximumExpiryDelta: uint(
      item.maximumExpiryDelta,
      MAX_EXPIRY_HEIGHT,
      'zcash.sourcePolicy.maximumExpiryDelta',
      true,
    ),
  };
}

function chainConfig(
  value: unknown,
  network: ZcashNetwork,
  fee: bigint,
): ZcashGuardConfig['chain'] {
  const item = exactRecord(
    value,
    ['addresses', 'rwtId', 'confirmations'],
    [],
    'zcash.chain',
  );
  const rawAddresses = exactRecord(
    item.addresses,
    ['lock', 'cold', 'permit', 'fraud'],
    [],
    'zcash.chain.addresses',
  );
  const lock = textValue(rawAddresses.lock, 'zcash.chain.addresses.lock');
  const cold = rawAddresses.cold;
  if (typeof cold !== 'string') invalid('zcash.chain.addresses.cold');
  const codec = createZcashAddressCodec(network);
  try {
    codec.parseAddress(lock);
    if (cold !== '') codec.parseAddress(cold);
  } catch {
    invalid('zcash.chain.addresses');
  }

  const rawConfirmations = exactRecord(
    item.confirmations,
    ['observation', 'payment', 'cold', 'manual', 'arbitrary'],
    [],
    'zcash.chain.confirmations',
  );
  const confirmations = Object.fromEntries(
    ['observation', 'payment', 'cold', 'manual', 'arbitrary'].map((key) => [
      key,
      uint(
        rawConfirmations[key],
        UINT32_MAX,
        `zcash.chain.confirmations.${key}`,
      ),
    ]),
  ) as unknown as ZcashGuardConfig['chain']['confirmations'];

  return {
    addresses: {
      lock,
      cold,
      permit: textValue(rawAddresses.permit, 'zcash.chain.addresses.permit'),
      fraud: textValue(rawAddresses.fraud, 'zcash.chain.addresses.fraud'),
    },
    rwtId: canonicalHex(item.rwtId, 64, 'zcash.chain.rwtId'),
    confirmations,
    fee,
  };
}

function paymentConfig(value: unknown): ZcashGuardConfig['payment'] {
  const item = exactRecord(
    value,
    ['feeFloorZat', 'maximumFeeZat', 'minimumOutputZat', 'expiryDelta'],
    [],
    'zcash.payment',
  );
  const feeFloorZat = zatoshis(item.feeFloorZat, 'zcash.payment.feeFloorZat');
  const maximumFeeZat = zatoshis(
    item.maximumFeeZat,
    'zcash.payment.maximumFeeZat',
  );
  if (feeFloorZat > maximumFeeZat) invalid('zcash.payment.maximumFeeZat');
  return {
    feeFloorZat,
    maximumFeeZat,
    minimumOutputZat: zatoshis(
      item.minimumOutputZat,
      'zcash.payment.minimumOutputZat',
      true,
    ),
    expiryDelta: uint(
      item.expiryDelta,
      MAX_EXPIRY_HEIGHT,
      'zcash.payment.expiryDelta',
      true,
    ),
  };
}

function signingConfig(value: unknown): ZcashGuardConfig['signing'] {
  const item = exactRecord(
    value,
    [
      'publicKey',
      'chainCode',
      'derivationPath',
      'effectiveThreshold',
      'protocolVersion',
      'maxObservationAgeMs',
    ],
    [],
    'zcash.signing',
  );
  const publicKey = canonicalHex(item.publicKey, 66, 'zcash.signing.publicKey');
  if (!/^(02|03)/.test(publicKey)) invalid('zcash.signing.publicKey');
  try {
    const canonical = ECDH.convertKey(
      Buffer.from(publicKey, 'hex'),
      'secp256k1',
      undefined,
      undefined,
      'compressed',
    ).toString('hex');
    if (canonical !== publicKey) invalid('zcash.signing.publicKey');
  } catch {
    invalid('zcash.signing.publicKey');
  }
  if (
    typeof item.chainCode !== 'string' ||
    item.chainCode.length < 2 ||
    item.chainCode.length > 64 ||
    item.chainCode.length % 2 !== 0 ||
    !/^[0-9a-f]+$/.test(item.chainCode)
  ) {
    invalid('zcash.signing.chainCode');
  }
  if (
    !Array.isArray(item.derivationPath) ||
    item.derivationPath.length > MAX_PATH_COMPONENTS
  ) {
    invalid('zcash.signing.derivationPath');
  }
  const derivationPath = item.derivationPath.map((component, index) =>
    uint(component, UINT31_MAX, `zcash.signing.derivationPath[${index}]`),
  );
  return {
    publicKey,
    chainCode: item.chainCode,
    derivationPath,
    effectiveThreshold: uint(
      item.effectiveThreshold,
      UINT32_MAX,
      'zcash.signing.effectiveThreshold',
      true,
    ),
    protocolVersion: textValue(
      item.protocolVersion,
      'zcash.signing.protocolVersion',
      80,
    ),
    maxObservationAgeMs: uint(
      item.maxObservationAgeMs,
      MAX_TIMEOUT_MS,
      'zcash.signing.maxObservationAgeMs',
      true,
    ),
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function parseZcashGuardConfig(
  value: unknown,
): ZcashGuardConfig | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).enabled === false
  ) {
    exactRecord(value, ['enabled']);
    return undefined;
  }
  const item = exactRecord(value, [
    'enabled',
    'rpc',
    'sourcePolicy',
    'native',
    'inspector',
    'chain',
    'payment',
    'signing',
  ]);
  if (item.enabled !== true) invalid('zcash.enabled');

  const source = sourcePolicy(item.sourcePolicy);
  const payment = paymentConfig(item.payment);
  if (payment.expiryDelta > source.maximumExpiryDelta) {
    invalid('zcash.payment.expiryDelta');
  }
  return deepFreeze({
    enabled: true,
    rpc: rpcConfig(item.rpc),
    sourcePolicy: source,
    native: executable(item.native, 'zcash.native'),
    inspector: executable(item.inspector, 'zcash.inspector'),
    chain: chainConfig(item.chain, source.network, payment.feeFloorZat),
    payment,
    signing: signingConfig(item.signing),
  });
}

class GuardsZcashConfigs {
  static read(): ZcashGuardConfig | undefined {
    return parseZcashGuardConfig(
      config.has('zcash') ? config.get<unknown>('zcash') : undefined,
    );
  }
}

export default GuardsZcashConfigs;
