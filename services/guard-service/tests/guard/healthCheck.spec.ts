import bchHealthRegistration_originalConfig from 'config';

import { TokenMap as bchHealthRegistration_TokenMap } from '@rosen-bridge/tokens';

import { rosenConfig as bchHealthRegistration_originalRosenConfig } from '../../src/configs/rosenConfig';
import {
  bchContract as bchHealthRegistration_bchContract,
  bchTokenSet as bchHealthRegistration_bchTokenSet,
  bchValues as bchHealthRegistration_bchValues,
  bchLock as bchHealthRegistration_bchLock,
} from '../configs/bitcoinCashTestUtils';
import { createBitcoinCashConfigMock } from '../configs/mocked/guardsBitcoinCashConfigs.mock';

describe('getHealthCheck', () => {
  describe('BCH RCS bitcoinCashHealthRegistration', () => {
    let values: Record<string, unknown>;
    let tokens: bchHealthRegistration_TokenMap;
    /** Read the synthetic BCH contract and delegate other chain configurations. */
    const reader = vi.fn((chain: string) =>
      chain === 'bitcoin-cash'
        ? bchHealthRegistration_bchContract()
        : bchHealthRegistration_originalRosenConfig.contractReader(
            chain as Parameters<
              typeof bchHealthRegistration_originalRosenConfig.contractReader
            >[0],
          ),
    );
    const networkConstructor = vi.fn();
    /** Return the mutable native-asset response without external requests. */
    const getAddressAssets = vi.fn(async () => ({
      nativeToken: 100n,
      tokens: [],
    }));
    const tokenLookup = vi.fn();
    beforeEach(async () => {
      vi.resetModules();
      values = {
        ...bchHealthRegistration_bchValues(),
        'bitcoinCash.health.enabled': true,
        'bitcoinCash.health.warnThreshold': '100',
        'bitcoinCash.health.criticalThreshold': '50',
      };
      // Wrapped decimals deliberately differ from native BCH decimals.
      tokens = new bchHealthRegistration_TokenMap();
      const mapping = bchHealthRegistration_bchTokenSet();
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
      vi.doMock('config', () =>
        createBitcoinCashConfigMock(
          () => values,
          bchHealthRegistration_originalConfig,
        ),
      );
      vi.doMock('../../src/configs/rosenConfig', () => ({
        rosenConfig: {
          ...bchHealthRegistration_originalRosenConfig,
          contractReader: reader,
        },
      }));
      vi.doMock('../../src/handlers/tokenHandler', () => ({
        TokenHandler: {
          /** Return the test singleton without production initialization. */
          getInstance: () => {
            tokenLookup();
            return {
              /** Return the mutable synthetic token map used by this scenario. */
              getTokenMap: () => tokens,
            };
          },
        },
      }));
      vi.doMock('../../src/handlers/notificationHandler', () => ({
        NotificationHandler: {
          /** Return the test singleton without production initialization. */
          getInstance: () => ({ notify: vi.fn() }),
        },
      }));
      vi.doMock('@rosen-chains/bitcoin-cash-rpc', async (importOriginal) => ({
        ...(await importOriginal<
          typeof import('@rosen-chains/bitcoin-cash-rpc')
        >()),
        BitcoinCashRpcNetwork: class {
          /** Record fixture constructor arguments without initializing external clients. */
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
    /** Import and initialize the health singleton after the scenario mocks are installed. */
    const health = async () =>
      (await import('../../src/guard/healthCheck')).getHealthCheck();
    /**
     * @target getHealthCheck - avoids BCH configuration and network with
     * chain=%s health=%s
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario avoids BCH configuration and network with chain=%s
     * health=%s.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
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
            .some(
              (param) =>
                param.id === `asset_bch_${bchHealthRegistration_bchLock}`,
            ),
        ).toEqual(false);
        expect(
          reader.mock.calls.some(([chain]) => chain === 'bitcoin-cash'),
        ).toEqual(false);
        expect(tokenLookup).not.toHaveBeenCalled();
        expect(networkConstructor).not.toHaveBeenCalled();
      },
    );
    /**
     * @target getHealthCheck - registers raw native RPC assets once,
     * independent of wrapped decimals
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario registers raw native RPC assets once, independent of wrapped
     * decimals.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
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
      await result.updateParam(`asset_bch_${bchHealthRegistration_bchLock}`);
      const status = await result.getHealthStatusWithParamId(
        `asset_bch_${bchHealthRegistration_bchLock}`,
      );
      expect(status?.status).toEqual('Healthy');
      expect(status?.description).toContain('100 satoshis');
      expect(getAddressAssets).toHaveBeenCalledExactlyOnceWith(
        bchHealthRegistration_bchLock,
      );
    });
    /**
     * @target getHealthCheck - keeps construction failures fail-closed across
     * retries
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario keeps construction failures fail-closed across retries.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
    it('keeps construction failures fail-closed across retries', async () => {
      networkConstructor.mockImplementation(() => {
        throw Error('network construction failed');
      });
      await expect(health()).rejects.toThrow('network construction failed');
      await expect(health()).rejects.toThrow('network construction failed');
      expect(networkConstructor).toHaveBeenCalledTimes(2);
    });
    /**
     * @target getHealthCheck - rejects nonboolean health opt-in %#
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario rejects nonboolean health opt-in %#.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
    it.each(['true', 1, null])(
      'rejects nonboolean health opt-in %#',
      async (enabled) => {
        values['bitcoinCash.health.enabled'] = enabled;
        await expect(health()).rejects.toThrow('must be boolean');
        expect(networkConstructor).not.toHaveBeenCalled();
      },
    );
    /**
     * @target getHealthCheck - rejects inexact or out-of-range threshold %#
     * before network construction
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario rejects inexact or out-of-range threshold %# before network
     * construction.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
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
    /**
     * @target getHealthCheck - requires enabled %s
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario requires enabled %s.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
    it.each(['warnThreshold', 'criticalThreshold'])(
      'requires enabled %s',
      async (name) => {
        delete values[`bitcoinCash.health.${name}`];
        await expect(health()).rejects.toThrow();
        expect(networkConstructor).not.toHaveBeenCalled();
      },
    );
    /**
     * @target getHealthCheck - rejects invalid critical threshold %#
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario rejects invalid critical threshold %#.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
    it.each(['-1', '01', '2100000000000001', 50])(
      'rejects invalid critical threshold %#',
      async (value) => {
        values['bitcoinCash.health.criticalThreshold'] = value;
        await expect(health()).rejects.toThrow('health threshold');
        expect(networkConstructor).not.toHaveBeenCalled();
      },
    );
    /**
     * @target getHealthCheck - rejects critical threshold greater than warning
     * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
     * config/contract/notification/token readers and native RPC
     * constructor/assets.
     * @scenario rejects critical threshold greater than warning.
     * @expected Register only explicitly enabled native BCH assets, preserve
     * singleton identity, and reject invalid policy or construction before
     * claiming health.
     */
    it('rejects critical threshold greater than warning', async () => {
      values['bitcoinCash.health.criticalThreshold'] = '101';
      await expect(health()).rejects.toThrow('exceeds');
      expect(networkConstructor).not.toHaveBeenCalled();
    });
  });
});
