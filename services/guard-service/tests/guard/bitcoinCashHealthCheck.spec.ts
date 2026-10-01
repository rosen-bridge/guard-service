import { describe, expect, it, vi } from 'vitest';

import { HealthCheck, HealthStatusLevel } from '@rosen-bridge/health-check';
import type { BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';

import { BitcoinCashHealthCheckParam } from '../../src/guard/bitcoinCashHealthCheck';
import { bchLock } from '../configs/bitcoinCashFixtures';

describe('native BCH treasury health parameter', () => {
  const create = (warnThreshold = 100n, criticalThreshold = 50n) => {
    const getAddressAssets = vi.fn(async () => ({
      nativeToken: 100n,
      tokens: [],
    }));
    const param = new BitcoinCashHealthCheckParam(
      { getAddressAssets },
      bchLock,
      { warnThreshold, criticalThreshold },
    );
    const health = new HealthCheck();
    health.register(param);
    return { param, health, getAddressAssets };
  };
  it('starts unknown and cannot claim a healthy balance before RPC succeeds', () => {
    const { param } = create();
    expect(param.getHealthStatus()).toBe(HealthStatusLevel.BROKEN);
    expect(param.getDescription()).toContain('unknown');
    expect(param.getDetails()).toContain('unavailable');
  });
  it.each([
    [0n, HealthStatusLevel.BROKEN],
    [49n, HealthStatusLevel.BROKEN],
    [50n, HealthStatusLevel.UNSTABLE],
    [99n, HealthStatusLevel.UNSTABLE],
    [100n, HealthStatusLevel.HEALTHY],
    [101n, HealthStatusLevel.HEALTHY],
    [2100000000000000n, HealthStatusLevel.HEALTHY],
  ])('compares %s native satoshis exactly', async (amount, status) => {
    const { param, health, getAddressAssets } = create();
    getAddressAssets.mockResolvedValue({ nativeToken: amount, tokens: [] });
    await health.updateParam(param.getId());
    expect(getAddressAssets).toHaveBeenCalledExactlyOnceWith(bchLock);
    expect(param.getHealthStatus()).toBe(status);
    expect(param.getDescription()).toContain(`${amount} satoshis`);
    expect(param.getLastTrialErrorTime()).toBeUndefined();
  });
  it.each([
    [0n, 0n],
    [100n, 100n],
  ])(
    'treats equality at identical %s thresholds as sufficient',
    async (threshold, amount) => {
      const { param, getAddressAssets } = create(threshold, threshold);
      getAddressAssets.mockResolvedValue({ nativeToken: amount, tokens: [] });
      await param.update();
      expect(param.getHealthStatus()).toBe(HealthStatusLevel.HEALTHY);
    },
  );
  it.each(['RPC unavailable', 'BCHN expected chain identity mismatch'])(
    'clears a previously healthy balance on %s and sanitizes errors',
    async (error) => {
      const { param, health, getAddressAssets } = create();
      await health.updateParam(param.getId());
      expect(param.getHealthStatus()).toBe(HealthStatusLevel.HEALTHY);
      getAddressAssets.mockRejectedValue(
        Error(`${error}: http://secret-user:secret-password@example.invalid`),
      );
      await health.updateParam(param.getId());
      const status = await health.getHealthStatusWithParamId(param.getId());
      expect(status?.status).toBe(HealthStatusLevel.BROKEN);
      expect(status?.lastTrialErrorTime).toBeInstanceOf(Date);
      expect(status?.lastTrialErrorMessage).toBe(
        'BCH treasury balance update failed',
      );
      expect(JSON.stringify(status)).not.toContain('secret-');
      expect(param.getDescription()).toContain('unknown');
      getAddressAssets.mockResolvedValue({ nativeToken: 100n, tokens: [] });
      await health.updateParam(param.getId());
      expect(param.getLastTrialErrorTime()).toBeUndefined();
      expect(param.getHealthStatus()).toBe(HealthStatusLevel.HEALTHY);
    },
  );
  it.each([
    { nativeToken: 100, tokens: [] },
    { nativeToken: '100', tokens: [] },
    { nativeToken: -1n, tokens: [] },
    { nativeToken: 2100000000000001n, tokens: [] },
    { nativeToken: 100n, tokens: undefined },
    { nativeToken: 100n, tokens: [{ id: 'foreign', value: 1n }] },
    null,
  ])('fails closed on malformed raw assets %#', async (assets) => {
    const { param, getAddressAssets } = create();
    getAddressAssets.mockResolvedValue(assets as never);
    await param.update();
    expect(param.getHealthStatus()).toBe(HealthStatusLevel.BROKEN);
    expect(param.getLastTrialErrorMessage()).toBe(
      'BCH treasury balance update failed',
    );
  });
  it('records failed RPC identity validation as unknown in actual health history', async () => {
    const { param, getAddressAssets } = create();
    const health = new HealthCheck(vi.fn());
    health.register(param);
    const history = (
      health as unknown as {
        healthHistory: {
          updateHistoryForParam: (id: string, item: unknown) => Promise<void>;
        };
      }
    ).healthHistory;
    const update = vi.spyOn(history, 'updateHistoryForParam');
    getAddressAssets.mockRejectedValue(Error('identity mismatch'));
    await health.updateParam(param.getId());
    expect(update).toHaveBeenCalledWith(param.getId(), {
      result: 'unknown',
      timestamp: expect.any(Number),
    });
    expect(await health.getOverallHealthStatus()).toBe(
      HealthStatusLevel.BROKEN,
    );
  });
  it.each([
    { warnThreshold: 100n, criticalThreshold: -1n },
    { warnThreshold: -1n, criticalThreshold: 0n },
    { warnThreshold: 100n, criticalThreshold: 101n },
    { warnThreshold: 2100000000000001n, criticalThreshold: 0n },
    { warnThreshold: 100, criticalThreshold: 50n },
  ])('rejects invalid constructor policy %#', (policy) => {
    expect(
      () =>
        new BitcoinCashHealthCheckParam(
          {} as Pick<BitcoinCashRpcNetwork, 'getAddressAssets'>,
          bchLock,
          policy as never,
        ),
    ).toThrow('thresholds');
  });
});
