import originalConfig from 'config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenMap } from '@rosen-bridge/tokens';

import { rosenConfig as originalRosenConfig } from '../../src/configs/rosenConfig';
import {
  bchContract,
  bchTokenSet,
  bchValues,
  bchLock,
} from '../configs/bitcoinCashFixtures';

describe('BCH health configuration and production registration', () => {
  let values: Record<string, unknown>;
  let tokens: TokenMap;
  const reader = vi.fn((chain: string) =>
    chain === 'bitcoin-cash'
      ? bchContract()
      : originalRosenConfig.contractReader(
          chain as Parameters<typeof originalRosenConfig.contractReader>[0],
        ),
  );
  const networkConstructor = vi.fn();
  const getAddressAssets = vi.fn(async () => ({
    nativeToken: 100n,
    tokens: [],
  }));
  const tokenLookup = vi.fn();
  beforeEach(async () => {
    vi.resetModules();
    values = {
      ...bchValues(),
      'bitcoinCash.health.enabled': true,
      'bitcoinCash.health.warnThreshold': '100',
      'bitcoinCash.health.criticalThreshold': '50',
    };
    // Wrapped decimals deliberately differ from native BCH decimals.
    tokens = new TokenMap();
    const mapping = bchTokenSet();
    mapping[0].ergo.decimals = 3;
    await tokens.updateConfigByJson(mapping);
    reader.mockClear();
    networkConstructor.mockReset();
    tokenLookup.mockClear();
    getAddressAssets
      .mockReset()
      .mockResolvedValue({ nativeToken: 100n, tokens: [] });
    const { DefaultLogger, DummyLogger } = await import(
      '@rosen-bridge/abstract-logger'
    );
    DefaultLogger.init(new DummyLogger());
    vi.doMock('config', () => ({
      default: {
        has: (key: string) =>
          Object.hasOwn(values, key) || originalConfig.has(key),
        get: (key: string) =>
          Object.hasOwn(values, key) ? values[key] : originalConfig.get(key),
      },
    }));
    vi.doMock('../../src/configs/rosenConfig', () => ({
      rosenConfig: { ...originalRosenConfig, contractReader: reader },
    }));
    vi.doMock('../../src/handlers/tokenHandler', () => ({
      TokenHandler: {
        getInstance: () => {
          tokenLookup();
          return { getTokenMap: () => tokens };
        },
      },
    }));
    vi.doMock('../../src/handlers/notificationHandler', () => ({
      NotificationHandler: { getInstance: () => ({ notify: vi.fn() }) },
    }));
    vi.doMock('@rosen-chains/bitcoin-cash-rpc', () => ({
      BitcoinCashRpcNetwork: class {
        constructor(config: unknown) {
          networkConstructor(config);
          return { getAddressAssets, logger: undefined };
        }
      },
    }));
  });
  afterEach(() => {
    for (const id of [
      'config',
      '../../src/configs/rosenConfig',
      '../../src/handlers/tokenHandler',
      '../../src/handlers/notificationHandler',
      '@rosen-chains/bitcoin-cash-rpc',
    ])
      vi.doUnmock(id);
  });
  const load = async () =>
    (await import('../../src/configs/guardsBitcoinCashConfigs')).default;
  const health = async () =>
    (await import('../../src/guard/healthCheck')).getHealthCheck();
  it.each([
    [false, true],
    [true, false],
    [false, 'invalid'],
  ])(
    'avoids BCH configuration and network with chain=%s health=%s',
    async (enabled, healthEnabled) => {
      values['bitcoinCash.enabled'] = enabled;
      values['bitcoinCash.health.enabled'] = healthEnabled;
      const result = await health();
      expect(
        result
          .getHealthStatus()
          .some((param) => param.id === `asset_bch_${bchLock}`),
      ).toBe(false);
      expect(
        reader.mock.calls.some(([chain]) => chain === 'bitcoin-cash'),
      ).toBe(false);
      expect(tokenLookup).not.toHaveBeenCalled();
      expect(networkConstructor).not.toHaveBeenCalled();
    },
  );
  it('registers raw native RPC assets once, independent of wrapped decimals', async () => {
    const result = await health();
    expect(await health()).toBe(result);
    expect(networkConstructor).toHaveBeenCalledExactlyOnceWith({
      url: values['bitcoinCash.rpc.url'],
      expectedChain: 'regtest',
      timeoutMs: 5000,
      walletHistoryPageSize: 100,
      maxWalletHistoryPages: 20,
    });
    await result.updateParam(`asset_bch_${bchLock}`);
    const status = await result.getHealthStatusWithParamId(
      `asset_bch_${bchLock}`,
    );
    expect(status?.status).toBe('Healthy');
    expect(status?.description).toContain('100 satoshis');
    expect(getAddressAssets).toHaveBeenCalledExactlyOnceWith(bchLock);
  });
  it('keeps construction failures fail-closed across retries', async () => {
    networkConstructor.mockImplementation(() => {
      throw Error('network construction failed');
    });
    await expect(health()).rejects.toThrow('network construction failed');
    await expect(health()).rejects.toThrow('network construction failed');
    expect(networkConstructor).toHaveBeenCalledTimes(2);
  });
  it.each(['true', 1, null])(
    'rejects nonboolean health opt-in %#',
    async (enabled) => {
      values['bitcoinCash.health.enabled'] = enabled;
      await expect(health()).rejects.toThrow('must be boolean');
      expect(networkConstructor).not.toHaveBeenCalled();
    },
  );
  it.each(['0', '100', '2100000000000000'])(
    'loads exact decimal warning threshold %s',
    async (value) => {
      values['bitcoinCash.health.warnThreshold'] = value;
      values['bitcoinCash.health.criticalThreshold'] = '0';
      const configs = await load();
      const policy = configs.load(tokens).health;
      expect(policy?.warnThreshold).toBe(BigInt(value));
      expect(Object.isFrozen(policy)).toBe(true);
    },
  );
  it.each([
    100,
    1.5,
    -1,
    '-1',
    '01',
    '+1',
    '1.0',
    '1e2',
    ' 100',
    '',
    null,
    '2100000000000001',
  ])(
    'rejects inexact or out-of-range threshold %# before network construction',
    async (value) => {
      values['bitcoinCash.health.warnThreshold'] = value;
      await expect(health()).rejects.toThrow('health threshold');
      expect(networkConstructor).not.toHaveBeenCalled();
      // Retry must still reject rather than return a partly initialized singleton.
      await expect(health()).rejects.toThrow('health threshold');
    },
  );
  it.each(['warnThreshold', 'criticalThreshold'])(
    'requires enabled %s',
    async (name) => {
      delete values[`bitcoinCash.health.${name}`];
      await expect(health()).rejects.toThrow();
      expect(networkConstructor).not.toHaveBeenCalled();
    },
  );
  it.each(['-1', '01', '2100000000000001', 50])(
    'rejects invalid critical threshold %#',
    async (value) => {
      values['bitcoinCash.health.criticalThreshold'] = value;
      await expect(health()).rejects.toThrow('health threshold');
      expect(networkConstructor).not.toHaveBeenCalled();
    },
  );
  it('rejects critical threshold greater than warning', async () => {
    values['bitcoinCash.health.criticalThreshold'] = '101';
    await expect(health()).rejects.toThrow('exceeds');
    expect(networkConstructor).not.toHaveBeenCalled();
  });
});
