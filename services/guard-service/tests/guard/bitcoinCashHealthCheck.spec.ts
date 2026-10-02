import { describe, expect, it, vi } from 'vitest';

import { HealthCheck, HealthStatusLevel } from '@rosen-bridge/health-check';
import type { BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';

import { BitcoinCashHealthCheckParam } from '../../src/guard/bitcoinCashHealthCheck';
import { bchLock } from '../configs/bitcoinCashFixtures';

describe('BitcoinCashHealthCheckParam', () => {
  /**
   * Register a treasury parameter with a deterministic native-asset provider.
   * @param warnThreshold - Healthy-balance threshold in satoshis; defaults to 100n
   * @param criticalThreshold - Broken-balance threshold in satoshis; defaults to 50n
   * @returns Parameter, health manager and mutable provider mock
   */
  const create = (warnThreshold = 100n, criticalThreshold = 50n) => {
    /** Return the mutable native-asset response without external requests. */
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
  describe('getHealthStatus', () => {
    /**
     * @target BitcoinCashHealthCheckParam.getHealthStatus - starts unknown and
     * cannot claim a healthy balance before RPC succeeds
     * @dependencies create with an unqueried deterministic asset provider
     * @scenario Read a newly registered parameter before any successful
     * balance update.
     * @expected Report BROKEN with unknown and unavailable balance details.
     */
    it('starts unknown and cannot claim a healthy balance before RPC succeeds', () => {
      const { param } = create();
      expect(param.getHealthStatus()).toEqual(HealthStatusLevel.BROKEN);
      expect(param.getDescription()).toContain('unknown');
      expect(param.getDetails()).toContain('unavailable');
    });
  });
  describe('update', () => {
    /**
     * @target BitcoinCashHealthCheckParam.update - compares %s native satoshis
     * exactly
     * @dependencies HealthCheck.updateParam and native bigint asset mock
     * @scenario Check balances 0, 49, 50, 99, 100, 101 and BCH_MAX_MONEY
     * against critical=50 and warn=100.
     * @expected Return the corresponding BROKEN/UNSTABLE/HEALTHY level, exact
     * satoshi description and no error timestamp.
     */
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
      expect(param.getHealthStatus()).toEqual(status);
      expect(param.getDescription()).toContain(`${amount} satoshis`);
      expect(param.getLastTrialErrorTime()).toBeUndefined();
    });
    /**
     * @target BitcoinCashHealthCheckParam.update - treats equality at
     * identical %s thresholds as sufficient
     * @dependencies create with identical warning and critical thresholds
     * @scenario Set equal thresholds and balances to 0n or 100n.
     * @expected Report HEALTHY at exact threshold equality.
     */
    it.each([
      [0n, 0n],
      [100n, 100n],
    ])(
      'treats equality at identical %s thresholds as sufficient',
      async (threshold, amount) => {
        const { param, getAddressAssets } = create(threshold, threshold);
        getAddressAssets.mockResolvedValue({ nativeToken: amount, tokens: [] });
        await param.update();
        expect(param.getHealthStatus()).toEqual(HealthStatusLevel.HEALTHY);
      },
    );
    /**
     * @target BitcoinCashHealthCheckParam.update - clears a previously healthy
     * balance on %s and sanitizes errors
     * @dependencies HealthCheck registration and mutable asset-provider
     * rejection
     * @scenario First establish health, then fail RPC availability or chain
     * identity with embedded synthetic credentials, then recover.
     * @expected Clear the balance, record sanitized BROKEN status and error
     * time, then restore healthy status without the old error.
     */
    it.each(['RPC unavailable', 'BCHN expected chain identity mismatch'])(
      'clears a previously healthy balance on %s and sanitizes errors',
      async (error) => {
        const { param, health, getAddressAssets } = create();
        await health.updateParam(param.getId());
        expect(param.getHealthStatus()).toEqual(HealthStatusLevel.HEALTHY);
        getAddressAssets.mockRejectedValue(
          Error(`${error}: http://secret-user:secret-password@example.invalid`),
        );
        await health.updateParam(param.getId());
        const status = await health.getHealthStatusWithParamId(param.getId());
        expect(status?.status).toEqual(HealthStatusLevel.BROKEN);
        expect(status?.lastTrialErrorTime).toBeInstanceOf(Date);
        expect(status?.lastTrialErrorMessage).toEqual(
          'BCH treasury balance update failed',
        );
        expect(JSON.stringify(status)).not.toContain('secret-');
        expect(param.getDescription()).toContain('unknown');
        getAddressAssets.mockResolvedValue({ nativeToken: 100n, tokens: [] });
        await health.updateParam(param.getId());
        expect(param.getLastTrialErrorTime()).toBeUndefined();
        expect(param.getHealthStatus()).toEqual(HealthStatusLevel.HEALTHY);
      },
    );
    /**
     * @target BitcoinCashHealthCheckParam.update - fails closed on malformed
     * raw assets %#
     * @dependencies Asset-provider vectors with non-bigint/negative/overflow
     * amounts, missing/foreign tokens or null
     * @scenario Supply each malformed raw balance result to a parameter
     * update.
     * @expected Report BROKEN with the sanitized treasury balance update
     * error.
     */
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
      expect(param.getHealthStatus()).toEqual(HealthStatusLevel.BROKEN);
      expect(param.getLastTrialErrorMessage()).toEqual(
        'BCH treasury balance update failed',
      );
    });
    /**
     * @target BitcoinCashHealthCheckParam.update - records failed RPC identity
     * validation as unknown in actual health history
     * @dependencies HealthCheck with a history spy and rejected identity check
     * @scenario Update the registered parameter after the provider rejects
     * chain identity.
     * @expected Store an unknown history result and report overall BROKEN
     * status.
     */
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
      expect(await health.getOverallHealthStatus()).toEqual(
        HealthStatusLevel.BROKEN,
      );
    });
  });
  describe('constructor', () => {
    /**
     * @target BitcoinCashHealthCheckParam.constructor - rejects invalid
     * constructor policy %#
     * @dependencies Synthetic treasury address and invalid threshold vectors
     * @scenario Use negative, reversed, excessive or non-bigint constructor
     * thresholds.
     * @expected Reject construction with a thresholds error.
     */
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
});
