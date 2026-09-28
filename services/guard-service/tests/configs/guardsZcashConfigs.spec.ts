import config from 'config';

import {
  parseZcashGuardConfig,
  type ZcashGuardConfig,
} from '../../src/configs/guardsZcashConfigs';
import GuardsZcashConfigs from '../../src/configs/guardsZcashConfigs';

const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const cold = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';

function actualConfig() {
  return {
    enabled: true,
    rpc: {
      rpcUrl: 'http://127.0.0.1:18232/',
      auth: { username: 'guard', password: 'secret' },
      timeoutMs: 10_000,
      maxResponseBytes: 64 * 1024 * 1024,
    },
    sourcePolicy: {
      network: 'regtest',
      genesisHash: '00'.repeat(32),
      sourceId: 'controlled-zebra',
      branches: [
        { height: 0, branchId: 'c2d6d0b4' },
        { height: 106, branchId: 'c8e71055' },
      ],
      minimumConfirmations: 10,
      maximumExpiryDelta: 200,
    },
    native: {
      executablePath: 'C:\\zcash\\payment.exe',
      expectedSha256: '11'.repeat(32),
    },
    inspector: {
      executablePath: 'C:\\zcash\\inspector.exe',
      expectedSha256: '22'.repeat(32),
    },
    chain: {
      addresses: {
        lock: reserve,
        cold,
        permit: 'permit-address',
        fraud: 'fraud-address',
      },
      rwtId: '33'.repeat(32),
      confirmations: {
        observation: 10,
        payment: 12,
        cold: 14,
        manual: 16,
        arbitrary: 18,
      },
    },
    payment: {
      feeFloorZat: '10000',
      maximumFeeZat: '20000',
      minimumOutputZat: '1',
      expiryDelta: 100,
    },
    signing: {
      publicKey:
        '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      chainCode: 'aabbccdd',
      derivationPath: [44, 133, 0, 0],
      effectiveThreshold: 3,
      protocolVersion: '1.0.0',
      maxObservationAgeMs: 5_000,
    },
  };
}

type ActualConfig = ReturnType<typeof actualConfig>;

function change(mutate: (value: ActualConfig) => void): ActualConfig {
  const value = actualConfig();
  mutate(value);
  return value;
}

describe('Zcash guard configuration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('parses the actual enabled shape and derives the chain fee', () => {
    const parsed = parseZcashGuardConfig(actualConfig());

    expect(parsed).toMatchObject({
      enabled: true,
      payment: {
        feeFloorZat: 10_000n,
        maximumFeeZat: 20_000n,
        minimumOutputZat: 1n,
        expiryDelta: 100,
      },
      chain: { fee: 10_000n },
    });
  });

  it('treats absence and the exact disabled shape as disabled', () => {
    expect(parseZcashGuardConfig(undefined)).toBeUndefined();
    expect(parseZcashGuardConfig({ enabled: false })).toBeUndefined();
    expect(() => parseZcashGuardConfig({ enabled: false, rpc: {} })).toThrow();
  });

  it('reads the optional zcash key without constructing runtime clients', () => {
    const has = vi.spyOn(config, 'has').mockReturnValue(true);
    const get = vi.spyOn(config, 'get').mockReturnValue(actualConfig());

    expect(GuardsZcashConfigs.read()?.chain.fee).toBe(10_000n);
    expect(has).toHaveBeenCalledWith('zcash');
    expect(get).toHaveBeenCalledWith('zcash');
  });

  it('copies and deeply freezes all returned records and arrays', () => {
    const input = actualConfig();
    const parsed = parseZcashGuardConfig(input) as ZcashGuardConfig;
    input.sourcePolicy.branches[0].branchId = 'deadbeef';
    input.signing.derivationPath[0] = 99;
    input.rpc.auth.password = 'changed';

    expect(parsed.sourcePolicy.branches[0].branchId).toBe('c2d6d0b4');
    expect(parsed.signing.derivationPath[0]).toBe(44);
    expect(parsed.rpc.auth?.password).toBe('secret');
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.sourcePolicy.branches)).toBe(true);
    expect(Object.isFrozen(parsed.sourcePolicy.branches[0])).toBe(true);
    expect(Object.isFrozen(parsed.signing.derivationPath)).toBe(true);
    expect(Object.isFrozen(parsed.rpc.auth)).toBe(true);
  });

  const malformedCases: Array<[string, (value: ActualConfig) => void]> = [
    [
      'unknown top-level key',
      (value) => ((value as ActualConfig & { extra?: boolean }).extra = true),
    ],
    [
      'enabled is missing',
      (value) => delete (value as Partial<ActualConfig>).enabled,
    ],
    ['non-loopback RPC', (value) => (value.rpc.rpcUrl = 'http://example.com')],
    [
      'RPC URL credentials',
      (value) => (value.rpc.rpcUrl = 'http://user:pass@127.0.0.1'),
    ],
    ['RPC username colon', (value) => (value.rpc.auth.username = 'guard:name')],
    ['zero RPC timeout', (value) => (value.rpc.timeoutMs = 0)],
    [
      'oversized RPC response',
      (value) => (value.rpc.maxResponseBytes = 64 * 1024 * 1024 + 1),
    ],
    [
      'unknown RPC key',
      (value) =>
        ((value.rpc as ActualConfig['rpc'] & { token?: string }).token =
          'secret'),
    ],
    ['unsupported network', (value) => (value.sourcePolicy.network = 'other')],
    [
      'noncanonical genesis hash',
      (value) => (value.sourcePolicy.genesisHash = 'AA'.repeat(32)),
    ],
    [
      'invalid source id',
      (value) => (value.sourcePolicy.sourceId = 'contains space'),
    ],
    [
      'branch schedule not starting at zero',
      (value) => (value.sourcePolicy.branches[0].height = 1),
    ],
    [
      'branch schedule not ascending',
      (value) => (value.sourcePolicy.branches[1].height = 0),
    ],
    [
      'too many branches',
      (value) =>
        (value.sourcePolicy.branches = Array.from(
          { length: 33 },
          (_, height) => ({ height, branchId: 'c2d6d0b4' }),
        )),
    ],
    [
      'malformed branch id',
      (value) => (value.sourcePolicy.branches[0].branchId = 'C2D6D0B4'),
    ],
    [
      'zero minimum confirmations',
      (value) => (value.sourcePolicy.minimumConfirmations = 0),
    ],
    [
      'excess maximum expiry delta',
      (value) => (value.sourcePolicy.maximumExpiryDelta = 500_000_000),
    ],
    [
      'relative native path',
      (value) => (value.native.executablePath = 'payment.exe'),
    ],
    [
      'malformed inspector digest',
      (value) => (value.inspector.expectedSha256 = 'AA'.repeat(32)),
    ],
    [
      'wrong-network lock address',
      (value) => (value.sourcePolicy.network = 'mainnet'),
    ],
    [
      'malformed cold address',
      (value) => (value.chain.addresses.cold = 'not-an-address'),
    ],
    ['empty permit address', (value) => (value.chain.addresses.permit = '')],
    ['malformed RWT id', (value) => (value.chain.rwtId = '00')],
    [
      'fractional confirmation',
      (value) => (value.chain.confirmations.payment = 1.5),
    ],
    [
      'noncanonical fee decimal',
      (value) => (value.payment.feeFloorZat = '010000'),
    ],
    [
      'fee above monetary bound',
      (value) => (value.payment.maximumFeeZat = '2100000000000001'),
    ],
    ['zero minimum output', (value) => (value.payment.minimumOutputZat = '0')],
    [
      'floor above maximum fee',
      (value) => (value.payment.maximumFeeZat = '9999'),
    ],
    [
      'expiry above source policy',
      (value) => (value.payment.expiryDelta = 201),
    ],
    [
      'off-curve compressed public key',
      (value) => (value.signing.publicKey = '02' + '00'.repeat(32)),
    ],
    ['uppercase chain code', (value) => (value.signing.chainCode = 'AABB')],
    ['odd chain code', (value) => (value.signing.chainCode = 'abc')],
    [
      'hardened derivation component',
      (value) => (value.signing.derivationPath[0] = 0x8000_0000),
    ],
    [
      'zero effective threshold',
      (value) => (value.signing.effectiveThreshold = 0),
    ],
    ['empty protocol version', (value) => (value.signing.protocolVersion = '')],
    [
      'zero observation age',
      (value) => (value.signing.maxObservationAgeMs = 0),
    ],
  ];

  it.each(malformedCases)('rejects %s', (_name, mutate) => {
    expect(() => parseZcashGuardConfig(change(mutate))).toThrow(
      'Invalid Zcash guard configuration',
    );
  });

  it('accepts an empty cold address and boundary payment amounts', () => {
    const parsed = parseZcashGuardConfig(
      change((value) => {
        value.chain.addresses.cold = '';
        value.payment.feeFloorZat = '0';
        value.payment.maximumFeeZat = '2100000000000000';
        value.payment.minimumOutputZat = '2100000000000000';
        value.payment.expiryDelta = 200;
      }),
    );

    expect(parsed?.chain.addresses.cold).toBe('');
    expect(parsed?.payment.maximumFeeZat).toBe(2_100_000_000_000_000n);
  });
});
