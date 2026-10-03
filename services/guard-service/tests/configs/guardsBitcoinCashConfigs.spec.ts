import bchConfigHealth_bchHealthRegistration_originalConfig from 'config';
import { delimiter } from 'path';
import { fileURLToPath } from 'url';

import { TokenMap as bchConfig_TokenMap } from '@rosen-bridge/tokens';
import { TokenMap as bchConfigHealth_bchHealthRegistration_TokenMap } from '@rosen-bridge/tokens';

import { rosenConfig as bchConfigHealth_bchHealthRegistration_originalRosenConfig } from '../../src/configs/rosenConfig';
import {
  bchContract as bchConfig_bchContract,
  bchTokenMap as bchConfig_bchTokenMap,
  bchTokenSet as bchConfig_bchTokenSet,
  bchValues as bchConfig_bchValues,
  bchCold as bchConfig_bchCold,
} from './bitcoinCashFixtures';
import {
  bchContract as bchConfigHealth_bchHealthRegistration_bchContract,
  bchTokenSet as bchConfigHealth_bchHealthRegistration_bchTokenSet,
  bchValues as bchConfigHealth_bchHealthRegistration_bchValues,
} from './bitcoinCashFixtures';
import { createBitcoinCashConfigMock } from './mocked/guardsBitcoinCashConfigs.mock';

describe('GuardsBitcoinCashConfigs', () => {
  describe('enabled', () => {
    describe('BCH RCS guardsBitcoinCashConfigs', () => {
      let values: Record<string, unknown>;
      let contract = bchConfig_bchContract();
      /** Read the synthetic BCH contract and delegate other chain configurations. */
      const reader = vi.fn(() => contract);
      beforeEach(() => {
        vi.resetModules();
        values = bchConfig_bchValues();
        contract = bchConfig_bchContract();
        reader.mockClear();
        vi.doMock('config', () => createBitcoinCashConfigMock(() => values));
        vi.doMock('../../src/configs/rosenConfig', () => ({
          rosenConfig: { contractReader: reader },
        }));
      });
      afterEach(() => {
        vi.doUnmock('config');
        vi.doUnmock('../../src/configs/rosenConfig');
      });
      /** Import and validate the current synthetic BCH operator configuration. */
      const load = async () => {
        const { default: configs } = await import(
          '../../src/configs/guardsBitcoinCashConfigs'
        );
        return configs;
      };
      /**
       * @target GuardsBitcoinCashConfigs.enabled - requires no BCH contracts
       * or policy when enabled is %s
       * @dependencies
       * - Mocked config reader and contract reader
       * @scenario
       * - Load absent and false enable flags without a BCH policy
       * - Attempt to load a TokenMap while disabled
       * @expected
       * - Enabled is false; contracts are never read and policy loading throws
       */
      it.each([false, undefined])(
        'requires no BCH contracts or policy when enabled is %s',
        async (enabled) => {
          values =
            enabled === undefined ? {} : { 'bitcoinCash.enabled': enabled };
          const configs = await load();
          expect(configs.enabled).toEqual(false);
          expect(reader).not.toHaveBeenCalled();
          expect(() => configs.load({} as bchConfig_TokenMap)).toThrow(
            'disabled',
          );
          expect(reader).not.toHaveBeenCalled();
        },
      );
      /**
       * @target GuardsBitcoinCashConfigs.enabled - rejects nonboolean enable
       * flag %#
       * @dependencies
       * - Mocked config reader
       * @scenario
       * - Read enabled with string, numeric and null values
       * @expected
       * - Each flag throws a boolean validation error
       */
      it.each(['true', 1, null])(
        'rejects nonboolean enable flag %#',
        async (enabled) => {
          values['bitcoinCash.enabled'] = enabled;
          const configs = await load();
          expect(() => configs.enabled).toThrow('boolean');
        },
      );
    });
  });

  describe('load', () => {
    describe('RPC environment mapping', () => {
      /**
       * Resolve real production defaults and secret mappings in isolation.
       * @param credentials - BCH credential environment variables for this case
       * @returns Real node-config readers bound to the resolved configuration
       */
      const resolveEnvironment = (credentials: Record<string, string>) => {
        const values = bchConfig_bchValues();
        delete values['balanceHandler.bitcoinCash.tokensPerIteration.rpc'];
        const overrides: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(values)) {
          const parts = key.split('.');
          let target = overrides;
          for (const part of parts.slice(0, -1)) {
            target[part] ??= {};
            target = target[part] as Record<string, unknown>;
          }
          target[parts[parts.length - 1]] = value;
        }
        const environment = {
          NODE_CONFIG_DIR: ['../../config', '../../docker']
            .map((path) => fileURLToPath(new URL(path, import.meta.url)))
            .join(delimiter),
          NODE_CONFIG_ENV: 'default',
          NODE_CONFIG: JSON.stringify(overrides),
          BITCOIN_RUNES_RPC_USERNAME: 'synthetic-other-chain-user',
          BITCOIN_RUNES_RPC_PASSWORD: 'test',
          ...credentials,
        };
        const keys = [
          ...Object.keys(environment),
          'BITCOIN_CASH_RPC_USERNAME',
          'BITCOIN_CASH_RPC_PASSWORD',
        ];
        const previous = new Map(keys.map((key) => [key, process.env[key]]));
        try {
          for (const key of keys) delete process.env[key];
          Object.assign(process.env, environment);
          const original = bchConfigHealth_bchHealthRegistration_originalConfig;
          const loaded = original.util.loadFileConfigs();
          return {
            get: original.get.bind(loaded),
            has: original.has.bind(loaded),
          };
        } finally {
          for (const [key, value] of previous)
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
      };

      beforeEach(() => {
        vi.resetModules();
      });
      afterEach(() => {
        vi.doUnmock('config');
        vi.doUnmock('../../src/configs/rosenConfig');
      });

      /**
       * @target GuardsBitcoinCashConfigs.load - resolves %s credentials and the
       * RCS batch default through production configuration
       * @dependencies Real node-config loader/get/has, default YAML and docker
       * mapping; isolated synthetic environment, contract reader and BCH TokenMap
       * @scenario Resolve the selected credential pair state with the actual
       * default batch value, restore environment, then load BCH operator policy
       * @expected Read batch9999, preserve a complete pair, reject either
       * unpaired value and keep absent BCH auth independent of another chain
       */
      it.each(['both', 'username', 'password', 'neither'] as const)(
        'resolves %s credentials and the RCS batch default through production configuration',
        async (mode) => {
          const credentials: Record<string, string> = {};
          if (mode === 'both' || mode === 'username')
            credentials.BITCOIN_CASH_RPC_USERNAME = 'synthetic-bch-user';
          if (mode === 'both' || mode === 'password')
            credentials.BITCOIN_CASH_RPC_PASSWORD = 'synthetic-bch-password';
          const readers = resolveEnvironment(credentials);
          expect(
            readers.get('balanceHandler.bitcoinCash.tokensPerIteration.rpc'),
          ).toEqual(9999);
          vi.doMock('config', () => ({ default: readers }));
          vi.doMock('../../src/configs/rosenConfig', () => ({
            rosenConfig: { contractReader: vi.fn(bchConfig_bchContract) },
          }));
          const { default: configs } = await import(
            '../../src/configs/guardsBitcoinCashConfigs'
          );
          const tokens = await bchConfig_bchTokenMap();
          if (mode === 'username' || mode === 'password') {
            expect(() => configs.load(tokens)).toThrow('paired');
          } else {
            expect(configs.load(tokens).rpc.auth).toEqual(
              mode === 'both'
                ? {
                    username: 'synthetic-bch-user',
                    password: 'synthetic-bch-password',
                  }
                : undefined,
            );
          }
        },
      );
    });

    describe('BCH RCS guardsBitcoinCashConfigs', () => {
      let values: Record<string, unknown>;
      let contract = bchConfig_bchContract();
      /** Read the synthetic BCH contract and delegate other chain configurations. */
      const reader = vi.fn(() => contract);
      beforeEach(() => {
        vi.resetModules();
        values = bchConfig_bchValues();
        contract = bchConfig_bchContract();
        reader.mockClear();
        vi.doMock('config', () => createBitcoinCashConfigMock(() => values));
        vi.doMock('../../src/configs/rosenConfig', () => ({
          rosenConfig: { contractReader: reader },
        }));
      });
      afterEach(() => {
        vi.doUnmock('config');
        vi.doUnmock('../../src/configs/rosenConfig');
      });
      /** Import and validate the current synthetic BCH operator configuration. */
      const load = async () => {
        const { default: configs } = await import(
          '../../src/configs/guardsBitcoinCashConfigs'
        );
        return configs;
      };
      /**
       * @target GuardsBitcoinCashConfigs.load - loads exact native
       * chain/RPC/TSS policy from actual supplied contract and TokenMap
       * @dependencies
       * - Mocked config and contract readers, real BCH TokenMap fixture
       * @scenario
       * - Load the configured contract, chain policy, RPC and derivation path
       * @expected
       * - Exact fee, treasury, RPC and path values are retained
       * - The contract reader is called exactly once for bitcoin-cash
       */
      it('loads exact native chain/RPC/TSS policy from actual supplied contract and TokenMap', async () => {
        const configs = await load();
        const result = configs.load(await bchConfig_bchTokenMap());
        expect(result.chainConfigs.maxFee).toEqual(10000n);
        expect(result.chainConfigs.minimumUtxoValue).toEqual(546n);
        expect(result.chainConfigs.addresses.lock).toEqual(
          contract.addresses.lock,
        );
        expect(result.rpc.timeoutMs).toEqual(5000);
        expect(result.rpc.expectedChain).toEqual('regtest');
        expect(result.derivationPath).toEqual([44, 145, 0, 0]);
        expect(configs.bitcoinCashContractConfig).toEqual(contract);
        expect(reader).toHaveBeenCalledExactlyOnceWith('bitcoin-cash');
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - accepts TLS and literal loopback
       * @dependencies Mocked config and contract readers, real BCH TokenMap
       * @scenario Change only the RPC endpoint to each allowed transport form
       * @expected Load the operator policy and preserve the configured URL
       */
      it.each([
        'https://rpc.example.test/wallet/treasury',
        'http://127.0.0.2:18443/wallet/treasury',
        'http://[::1]:18443/wallet/treasury',
      ])('accepts RPC endpoint %s', async (url) => {
        values['bitcoinCash.rpc.url'] = url;
        const configs = await load();
        expect(configs.load(await bchConfig_bchTokenMap()).rpc.url).toEqual(
          url,
        );
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - freezes the validated policy
       * and copies contract and derivation inputs
       * @dependencies
       * - Mocked config and contract readers, real BCH TokenMap fixture
       * @scenario
       * - Try changing frozen policy fields and the derivation path
       * - Mutate the original contract address after validation
       * @expected
       * - Policy mutations throw; the validated address remains unchanged
       */
      it('freezes the validated policy and copies contract and derivation inputs', async () => {
        const configs = await load();
        const loaded = configs.load(await bchConfig_bchTokenMap());
        expect(() => {
          loaded.chainConfigs.feeRate = 2;
        }).toThrow();
        expect(() => {
          loaded.rpc.url = 'http://changed.invalid';
        }).toThrow();
        expect(() => {
          loaded.derivationPath.push(1);
        }).toThrow();
        contract.addresses.lock = bchConfig_bchCold;
        expect(loaded.bitcoinCashContractConfig.addresses.lock).not.toEqual(
          bchConfig_bchCold,
        );
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - accepts both non-hardened
       * derivation boundaries supported by the TSS backend
       * @dependencies
       * - Mocked config reader and real BCH TokenMap fixture
       * @scenario
       * - Load a derivation path containing zero and 0x7fffffff
       * @expected
       * - Both exact boundary indexes are retained
       */
      it('accepts both non-hardened derivation boundaries supported by the TSS backend', async () => {
        values['bitcoinCash.derivationPath'] = [0, 0x7fffffff];
        const configs = await load();
        expect(
          configs.load(await bchConfig_bchTokenMap()).derivationPath,
        ).toEqual([0, 0x7fffffff]);
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - accepts native batch limit %s
       * @dependencies Owned config and contract readers; actual BCH TokenMap
       * @scenario Set only the inclusive minimum, RCS default or maximum
       * batch limit, then load the synthetic native BCH operator policy
       * @expected Accept all three integer limits without changing asset scope
       */
      it.each([1, 9999, 10000])(
        'accepts native batch limit %s',
        async (batch) => {
          values['balanceHandler.bitcoinCash.tokensPerIteration.rpc'] = batch;
          const configs = await load();
          const tokens = await bchConfig_bchTokenMap();
          expect(() => configs.load(tokens)).not.toThrow();
        },
      );
      /**
       * @target GuardsBitcoinCashConfigs.load - fails closed on invalid %s
       * @dependencies
       * - Mocked config and contract readers, BCH asset configuration fixture
       * @scenario
       * - Replace one network, fee, key, path, confirmation or limit field
       * - Load each isolated mutation from the table
       * @expected
       * - Every invalid field throws before a validated policy is returned
       */
      it.each([
        ['bitcoinCash.chainNetwork', 'esplora'],
        ['bitcoinCash.rpc.url', 'https://user:secret@example.com'],
        ['bitcoinCash.rpc.url', 'http://rpc.example.test'],
        ['bitcoinCash.rpc.url', 'http://localhost'],
        ['bitcoinCash.rpc.url', 'http://127.1'],
        ['bitcoinCash.rpc.url', 'http://[::ffff:127.0.0.1]'],
        ['bitcoinCash.rpc.url', 'https://@rpc.example.test'],
        ['bitcoinCash.rpc.url', 'https://rpc.example.test/#'],
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
        ['balanceHandler.bitcoinCash.tokensPerIteration.rpc', 0],
        ['balanceHandler.bitcoinCash.tokensPerIteration.rpc', 10001],
        ['balanceHandler.bitcoinCash.tokensPerIteration.rpc', 1.5],
        ['balanceHandler.default.updateInterval', 0],
        ['bitcoinCash.rpc.maxWalletHistoryPages', 101],
      ])('fails closed on invalid %s', async (key, value) => {
        values[key as string] = value;
        const configs = await load();
        expect(() =>
          configs.load({
            getConfig: bchConfig_bchTokenSet,
          } as unknown as bchConfig_TokenMap),
        ).toThrow();
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - requires paired RPC
       * credentials and preserves their exact values
       * @dependencies
       * - Mocked config reader and real BCH TokenMap fixture
       * @scenario
       * - Supply a username alone, then add its synthetic password
       * @expected
       * - The unpaired credentials throw; the complete pair is preserved
       */
      it('requires paired RPC credentials and preserves their exact values', async () => {
        values['bitcoinCash.rpc.username'] = 'operator';
        const configs = await load();
        expect(() =>
          configs.load({
            getConfig: bchConfig_bchTokenSet,
          } as unknown as bchConfig_TokenMap),
        ).toThrow('paired');
        values['bitcoinCash.rpc.password'] = 'synthetic-password';
        expect(configs.load(await bchConfig_bchTokenMap()).rpc.auth).toEqual({
          username: 'operator',
          password: 'synthetic-password',
        });
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - fails closed when enabled RPC
       * configuration is missing
       * @dependencies
       * - Mocked config and contract readers, BCH asset configuration fixture
       * @scenario
       * - Remove the expectedChain field and load the enabled policy
       * @expected
       * - Loading throws a missing-config error
       */
      it('fails closed when enabled RPC configuration is missing', async () => {
        delete values['bitcoinCash.rpc.expectedChain'];
        const configs = await load();
        expect(() =>
          configs.load({
            getConfig: bchConfig_bchTokenSet,
          } as unknown as bchConfig_TokenMap),
        ).toThrow('Missing config');
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - fails closed when the active
       * BCH contract entry is missing
       * @dependencies
       * - Mocked contract reader and BCH asset configuration fixture
       * @scenario
       * - Return no contract for the enabled BCH chain and load the policy
       * @expected
       * - Loading throws before a treasury can be used
       */
      it('fails closed when the active BCH contract entry is missing', async () => {
        reader.mockReturnValueOnce(
          undefined as unknown as ReturnType<typeof bchConfig_bchContract>,
        );
        const configs = await load();
        expect(() =>
          configs.load({
            getConfig: bchConfig_bchTokenSet,
          } as unknown as bchConfig_TokenMap),
        ).toThrow('treasury');
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - requires actual Ergo %s
       * contract address
       * @dependencies
       * - Mocked config and contract readers, BCH asset configuration fixture
       * @scenario
       * - Clear one permit, commitment, trigger, fraud or guard-sign address
       * - Load the policy for each isolated missing address
       * @expected
       * - Every incomplete contract entry throws
       */
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
          configs.load({
            getConfig: bchConfig_bchTokenSet,
          } as unknown as bchConfig_TokenMap),
        ).toThrow();
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - rejects treasury key mismatch,
       * noncanonical cold address and missing contract ids
       * @dependencies
       * - Mocked contract reader and real BCH TokenMap fixture
       * @scenario
       * - Independently replace the treasury address, cold encoding and RWT ID
       * @expected
       * - Each inconsistency throws its treasury, CashAddr or token error
       */
      it('rejects treasury key mismatch, noncanonical cold address and missing contract ids', async () => {
        const configs = await load();
        const tokens = await bchConfig_bchTokenMap();
        contract.addresses.lock = bchConfig_bchCold;
        expect(() => configs.load(tokens)).toThrow('treasury');
        contract = bchConfig_bchContract();
        contract.addresses.cold = contract.addresses.cold.toUpperCase();
        expect(() => configs.load(tokens)).toThrow('CashAddr');
        contract = bchConfig_bchContract();
        contract.tokens.RWTId = '';
        expect(() => configs.load(tokens)).toThrow('contract token');
      });
      /**
       * @target GuardsBitcoinCashConfigs.load - rejects invalid BCH mapping %s
       * @dependencies
       * - Mocked config and contract readers, mutated BCH TokenMap entries
       * @scenario
       * - Remove or duplicate BCH, change its token or decimals, or alter Ergo
       * - Load each isolated asset-map mutation
       * @expected
       * - Every invalid mapping throws a BCH validation error
       */
      it.each([
        'absent',
        'duplicates',
        'wrong-native',
        'wrong-decimals',
        'no-ergo',
        'native-ergo',
      ])('rejects invalid BCH mapping %s', async (kind) => {
        const sets = bchConfig_bchTokenSet();
        if (kind === 'absent') sets.length = 0;
        if (kind === 'duplicates') sets.push(structuredClone(sets[0]));
        if (kind === 'wrong-native') sets[0]['bitcoin-cash'].tokenId = 'token';
        if (kind === 'wrong-decimals') sets[0]['bitcoin-cash'].decimals = 7;
        if (kind === 'no-ergo') delete sets[0].ergo;
        if (kind === 'native-ergo') sets[0].ergo.residency = 'native';
        const configs = await load();
        expect(() =>
          configs.load({
            /** Provide the getConfig test seam for the current scenario without external requests. */
            getConfig: () => sets,
          } as unknown as bchConfig_TokenMap),
        ).toThrow('BCH');
      });
    });

    describe('BCH RCS health exact threshold', () => {
      let values: Record<string, unknown>;
      let tokens: bchConfigHealth_bchHealthRegistration_TokenMap;
      /** Read the synthetic BCH contract and delegate other chain configurations. */
      const reader = vi.fn((chain: string) =>
        chain === 'bitcoin-cash'
          ? bchConfigHealth_bchHealthRegistration_bchContract()
          : bchConfigHealth_bchHealthRegistration_originalRosenConfig.contractReader(
              chain as Parameters<
                typeof bchConfigHealth_bchHealthRegistration_originalRosenConfig.contractReader
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
          ...bchConfigHealth_bchHealthRegistration_bchValues(),
          'bitcoinCash.health.enabled': true,
          'bitcoinCash.health.warnThreshold': '100',
          'bitcoinCash.health.criticalThreshold': '50',
        };
        // Wrapped decimals deliberately differ from native BCH decimals.
        tokens = new bchConfigHealth_bchHealthRegistration_TokenMap();
        const mapping = bchConfigHealth_bchHealthRegistration_bchTokenSet();
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
            bchConfigHealth_bchHealthRegistration_originalConfig,
          ),
        );
        vi.doMock('../../src/configs/rosenConfig', () => ({
          rosenConfig: {
            ...bchConfigHealth_bchHealthRegistration_originalRosenConfig,
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
      /** Import and validate the current synthetic BCH operator configuration. */
      const load = async () =>
        (await import('../../src/configs/guardsBitcoinCashConfigs')).default;
      /**
       * @target GuardsBitcoinCashConfigs.load - loads exact decimal warning
       * threshold %s
       * @dependencies Real BCH8 TokenMap with wrapped decimals3; mocked
       * config/contract/notification/token readers and native RPC
       * constructor/assets.
       * @scenario loads exact decimal warning threshold %s.
       * @expected Retain the exact decimal raw-satoshi warning threshold in an
       * immutable validated health policy.
       */
      it.each(['0', '100', '2100000000000000'])(
        'loads exact decimal warning threshold %s',
        async (value) => {
          values['bitcoinCash.health.warnThreshold'] = value;
          values['bitcoinCash.health.criticalThreshold'] = '0';
          const configs = await load();
          const policy = configs.load(tokens).health;
          expect(policy?.warnThreshold).toEqual(BigInt(value));
          expect(Object.isFrozen(policy)).toEqual(true);
        },
      );
    });
  });
});
