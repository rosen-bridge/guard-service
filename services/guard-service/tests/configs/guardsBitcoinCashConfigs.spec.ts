import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenMap } from '@rosen-bridge/tokens';

import {
  bchContract,
  bchTokenMap,
  bchTokenSet,
  bchValues,
  bchCold,
} from './bitcoinCashFixtures';

describe('opt-in Bitcoin Cash configuration', () => {
  let values: Record<string, unknown>;
  let contract = bchContract();
  const reader = vi.fn(() => contract);
  beforeEach(() => {
    vi.resetModules();
    values = bchValues();
    contract = bchContract();
    reader.mockClear();
    vi.doMock('config', () => ({
      default: {
        has: (key: string) => Object.hasOwn(values, key),
        get: (key: string) => {
          if (!Object.hasOwn(values, key)) throw Error('Missing config key');
          return values[key];
        },
      },
    }));
    vi.doMock('../../src/configs/rosenConfig', () => ({
      rosenConfig: { contractReader: reader },
    }));
  });
  afterEach(() => {
    vi.doUnmock('config');
    vi.doUnmock('../../src/configs/rosenConfig');
  });
  const load = async () => {
    const { default: configs } = await import(
      '../../src/configs/guardsBitcoinCashConfigs'
    );
    return configs;
  };
  it.each([false, undefined])(
    'requires no BCH contracts or policy when enabled is %s',
    async (enabled) => {
      values = enabled === undefined ? {} : { 'bitcoinCash.enabled': enabled };
      const configs = await load();
      expect(configs.enabled).toBe(false);
      expect(reader).not.toHaveBeenCalled();
      expect(() => configs.load({} as TokenMap)).toThrow('disabled');
      expect(reader).not.toHaveBeenCalled();
    },
  );
  it.each(['true', 1, null])(
    'rejects nonboolean enable flag %#',
    async (enabled) => {
      values['bitcoinCash.enabled'] = enabled;
      const configs = await load();
      expect(() => configs.enabled).toThrow('boolean');
    },
  );
  it('loads exact native chain/RPC/TSS policy from actual supplied contract and TokenMap', async () => {
    const configs = await load();
    const result = configs.load(await bchTokenMap());
    expect(result.chainConfigs.maxFee).toBe(10000n);
    expect(result.chainConfigs.minimumUtxoValue).toBe(546n);
    expect(result.chainConfigs.addresses.lock).toBe(contract.addresses.lock);
    expect(result.rpc.timeoutMs).toBe(5000);
    expect(result.rpc.expectedChain).toBe('regtest');
    expect(result.derivationPath).toEqual([44, 145, 0, 0]);
    expect(configs.bitcoinCashContractConfig).toEqual(contract);
    expect(reader).toHaveBeenCalledExactlyOnceWith('bitcoin-cash');
  });
  it('freezes the validated policy and copies contract and derivation inputs', async () => {
    const configs = await load();
    const loaded = configs.load(await bchTokenMap());
    expect(() => {
      loaded.chainConfigs.feeRate = 2;
    }).toThrow();
    expect(() => {
      loaded.rpc.url = 'http://changed.invalid';
    }).toThrow();
    expect(() => {
      loaded.derivationPath.push(1);
    }).toThrow();
    contract.addresses.lock = bchCold;
    expect(loaded.bitcoinCashContractConfig.addresses.lock).not.toBe(bchCold);
  });
  it('accepts both non-hardened derivation boundaries supported by the TSS backend', async () => {
    values['bitcoinCash.derivationPath'] = [0, 0x7fffffff];
    const configs = await load();
    expect(configs.load(await bchTokenMap()).derivationPath).toEqual([
      0, 0x7fffffff,
    ]);
  });
  it.each([
    ['bitcoinCash.chainNetwork', 'esplora'],
    ['bitcoinCash.rpc.url', 'https://user:secret@example.com'],
    ['bitcoinCash.rpc.expectedChain', 'bitcoin'],
    ['bitcoinCash.rpc.timeoutMs', 0],
    ['bitcoinCash.feeRate', 1.1],
    ['bitcoinCash.maxFee', '010000'],
    ['bitcoinCash.maxFee', 1.1],
    ['bitcoinCash.minimumUtxoValue', '545'],
    ['bitcoinCash.maxUtxoPages', 101],
    ['bitcoinCash.bankPublicKey', '00'.repeat(33)],
    ['bitcoinCash.tssChainCode', ''],
    ['bitcoinCash.derivationPath', []],
    ['bitcoinCash.derivationPath', [0.1]],
    ['bitcoinCash.derivationPath', [0x80000000]],
    ['bitcoinCash.derivationPath', [0xffffffff]],
    ['bitcoinCash.confirmation.payment', 0],
    ['bitcoinCash.confirmation.observation', '6'],
    ['balanceHandler.bitcoinCash.tokensPerIteration.rpc', 2],
    ['balanceHandler.default.updateInterval', 0],
    ['bitcoinCash.rpc.maxWalletHistoryPages', 101],
  ])('fails closed on invalid %s', async (key, value) => {
    values[key as string] = value;
    const configs = await load();
    expect(() =>
      configs.load({ getConfig: bchTokenSet } as unknown as TokenMap),
    ).toThrow();
  });
  it('requires paired RPC credentials and preserves their exact values', async () => {
    values['bitcoinCash.rpc.username'] = 'operator';
    const configs = await load();
    expect(() =>
      configs.load({ getConfig: bchTokenSet } as unknown as TokenMap),
    ).toThrow('paired');
    values['bitcoinCash.rpc.password'] = 'synthetic-password';
    expect(configs.load(await bchTokenMap()).rpc.auth).toEqual({
      username: 'operator',
      password: 'synthetic-password',
    });
  });
  it('fails closed when enabled RPC configuration is missing', async () => {
    delete values['bitcoinCash.rpc.expectedChain'];
    const configs = await load();
    expect(() =>
      configs.load({ getConfig: bchTokenSet } as unknown as TokenMap),
    ).toThrow('Missing config');
  });
  it('fails closed when the active BCH contract entry is missing', async () => {
    reader.mockReturnValueOnce(
      undefined as unknown as ReturnType<typeof bchContract>,
    );
    const configs = await load();
    expect(() =>
      configs.load({ getConfig: bchTokenSet } as unknown as TokenMap),
    ).toThrow('treasury');
  });
  it.each([
    'WatcherPermit',
    'Commitment',
    'WatcherTriggerEvent',
    'Fraud',
    'guardSign',
  ])('requires actual Ergo %s contract address', async (key) => {
    contract.addresses[key as keyof typeof contract.addresses] = '';
    const configs = await load();
    expect(() =>
      configs.load({ getConfig: bchTokenSet } as unknown as TokenMap),
    ).toThrow();
  });
  it('rejects treasury key mismatch, noncanonical cold address and missing contract ids', async () => {
    const configs = await load();
    const tokens = await bchTokenMap();
    contract.addresses.lock = bchCold;
    expect(() => configs.load(tokens)).toThrow('treasury');
    contract = bchContract();
    contract.addresses.cold = contract.addresses.cold.toUpperCase();
    expect(() => configs.load(tokens)).toThrow('CashAddr');
    contract = bchContract();
    contract.tokens.RWTId = '';
    expect(() => configs.load(tokens)).toThrow('contract token');
  });
  it.each([
    'absent',
    'duplicates',
    'wrong-native',
    'wrong-decimals',
    'no-ergo',
    'native-ergo',
  ])('rejects invalid BCH mapping %s', async (kind) => {
    const sets = bchTokenSet();
    if (kind === 'absent') sets.length = 0;
    if (kind === 'duplicates') sets.push(structuredClone(sets[0]));
    if (kind === 'wrong-native') sets[0]['bitcoin-cash'].tokenId = 'token';
    if (kind === 'wrong-decimals') sets[0]['bitcoin-cash'].decimals = 7;
    if (kind === 'no-ergo') delete sets[0].ergo;
    if (kind === 'native-ergo') sets[0].ergo.residency = 'native';
    const configs = await load();
    expect(() =>
      configs.load({ getConfig: () => sets } as unknown as TokenMap),
    ).toThrow('BCH');
  });
  it('includes BCH in schema support but not active runtime enumeration when disabled', async () => {
    values = { 'bitcoinCash.enabled': false };
    const {
      SUPPORTED_CHAINS,
      ACTIVE_CHAINS,
      ChainNativeToken,
      ChainConfigKey,
    } = await import('../../src/utils/constants');
    expect(SUPPORTED_CHAINS).toContain('bitcoin-cash');
    expect(ACTIVE_CHAINS).not.toContain('bitcoin-cash');
    expect(ChainNativeToken['bitcoin-cash']).toBe('bch');
    expect(ChainConfigKey['bitcoin-cash']).toBe('bitcoinCash');
    const { SupportedChainsSchema, AddressQuerySchema } = await import(
      '../../src/api/schemas'
    );
    expect(SupportedChainsSchema.parse('bitcoin-cash')).toBe('bitcoin-cash');
    expect(AddressQuerySchema.parse({ chain: 'bitcoin-cash' }).chain).toBe(
      'bitcoin-cash',
    );
  });
  it('includes explicitly enabled BCH in active runtime enumeration', async () => {
    const { ACTIVE_CHAINS } = await import('../../src/utils/constants');
    expect(ACTIVE_CHAINS).toContain('bitcoin-cash');
  });
});
