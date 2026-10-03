import bchRegistration_originalConfig from 'config';

import { TokenMap as bchRegistration_TokenMap } from '@rosen-bridge/tokens';

import { rosenConfig as bchRegistration_originalRosenConfig } from '../../src/configs/rosenConfig';
import {
  bchContract as bchRegistration_bchContract,
  bchTokenMap as bchRegistration_bchTokenMap,
  bchValues as bchRegistration_bchValues,
} from '../configs/bitcoinCashFixtures';
import { createBitcoinCashConfigMock } from '../configs/mocked/guardsBitcoinCashConfigs.mock';

describe('runProcessors', () => {
  describe('BCH RCS bitcoinCashRegistration', () => {
    let values: Record<string, unknown>;
    let tokens: bchRegistration_TokenMap;
    /** Read the synthetic BCH contract and delegate other chain configurations. */
    const contractReader = vi.fn((chain: string) =>
      chain === 'bitcoin-cash'
        ? bchRegistration_bchContract()
        : bchRegistration_originalRosenConfig.contractReader(
            chain as Parameters<
              typeof bchRegistration_originalRosenConfig.contractReader
            >[0],
          ),
    );
    const networkConstructor = vi.fn();
    /** Record the requested curve-signing path and return a signer mock. */
    const wrapCurve = vi.fn(
      // Retain typed arguments for assertions on recorded TSS calls.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_chainCode: string, _derivationPath: number[]) => ({
        sign: vi.fn(),
        isInSign: vi.fn(),
      }),
    );
    const fakeNetwork = {
      logger: undefined,
      /** Return the mutable native-asset response without external requests. */
      getAddressAssets: vi.fn(async () => ({
        nativeToken: 123n,
        tokens: [],
      })),
    };
    const mocks: string[] = [];
    beforeEach(async () => {
      vi.resetModules();
      values = bchRegistration_bchValues();
      tokens = await bchRegistration_bchTokenMap();
      contractReader.mockClear();
      networkConstructor.mockClear();
      wrapCurve.mockClear();
      const { DefaultLogger, DummyLogger } = await import(
        '@rosen-bridge/abstract-logger'
      );
      DefaultLogger.init(new DummyLogger());
      fakeNetwork.getAddressAssets.mockClear();
      vi.doMock('config', () =>
        createBitcoinCashConfigMock(
          () => values,
          bchRegistration_originalConfig,
        ),
      );
      vi.doMock('../../src/configs/rosenConfig', () => ({
        rosenConfig: {
          ...bchRegistration_originalRosenConfig,
          contractReader,
        },
      }));
      vi.doMock('../../src/handlers/tokenHandler', () => ({
        TokenHandler: {
          /** Return the test singleton without production initialization. */
          getInstance: () => ({
            /** Return the mutable synthetic token map used by this scenario. */
            getTokenMap: () => tokens,
          }),
        },
      }));
      vi.doMock('../../src/handlers/tssHandler', () => ({
        default: {
          /** Return the test singleton without production initialization. */
          getInstance: () => ({
            wrapCurveSignMediator: wrapCurve,
            /** Provide the wrapEdwardSignMediator test seam for the current scenario without external requests. */
            wrapEdwardSignMediator: vi.fn(() => ({
              sign: vi.fn(),
              isInSign: vi.fn(),
            })),
          }),
        },
      }));
      vi.doMock('../../src/handlers/multiSigHandler', () => ({
        default: {
          /** Return the test singleton without production initialization. */
          getInstance: () => ({
            /** Return a signer mock without signing any transaction. */
            getErgoMultiSig: () => ({ sign: vi.fn(), isInSign: vi.fn() }),
          }),
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
            return fakeNetwork;
          }
        },
      }));
      for (const [pkg, name] of [
        ['binance', 'BinanceChain'],
        ['bitcoin', 'BitcoinChain'],
        ['bitcoin-runes', 'BitcoinRunesChain'],
        ['cardano', 'CardanoChain'],
        ['doge', 'DogeChain'],
        ['ergo', 'ErgoChain'],
        ['ethereum', 'EthereumChain'],
        ['firo', 'FiroChain'],
        ['handshake', 'HandshakeChain'],
      ]) {
        const id = `@rosen-chains/${pkg}`;
        mocks.push(id);
        vi.doMock(id, async () => ({
          ...(await vi.importActual<Record<string, unknown>>(id)),
          [name]: class {},
          ...(pkg === 'doge' ? { CombinedDogeNetwork: class {} } : {}),
        }));
      }
      for (const [pkg, name] of [
        ['bitcoin-esplora', 'default'],
        ['cardano-blockfrost-network', 'default'],
        ['cardano-koios-network', 'default'],
        ['doge-blockcypher', 'DogeBlockcypherNetwork'],
        ['doge-esplora', 'DogeEsploraNetwork'],
        ['doge-rpc', 'DogeRpcNetwork'],
        ['ergo-explorer-network', 'default'],
        ['ergo-node-network', 'default'],
        ['evm-rpc', 'default'],
        ['firo-electrumx', 'FiroElectrumXNetwork'],
        ['handshake-rpc', 'HandshakeRpcNetwork'],
        ['bitcoin-runes-rpc', 'BitcoinRunesRpcNetwork'],
      ]) {
        const id = `@rosen-chains/${pkg}`;
        mocks.push(id);
        vi.doMock(id, async () => ({
          ...(await vi.importActual<Record<string, unknown>>(id)),
          [name]: class {},
        }));
      }
    });
    afterEach(() => {
      for (const id of [
        ...mocks,
        'config',
        '@rosen-chains/bitcoin-cash-rpc',
        '../../src/configs/rosenConfig',
        '../../src/handlers/tokenHandler',
        '../../src/handlers/tssHandler',
        '../../src/handlers/multiSigHandler',
        '../../src/handlers/chainHandler',
        '../../src/db/databaseAction',
        '../../src/utils/intervalTimer',
      ])
        vi.doUnmock(id);
      vi.useRealTimers();
      mocks.length = 0;
    });
    /**
     * @target runProcessors - schedules balance runtime jobs only for active
     * chains with BCH enabled %s
     * @dependencies Mocked opt-in configuration, chain constructors, TSS and
     * interval-timer factory; actual ACTIVE_CHAINS.
     * @scenario Toggle BCH opt-in, collect interval construction and run the
     * processor scheduler with fake timers..
     * @expected Schedule one balance interval per active chain and construct
     * no BCH network during scheduling.
     */
    it.each([false, true])(
      'schedules balance runtime jobs only for active chains with BCH enabled %s',
      async (enabled) => {
        values['bitcoinCash.enabled'] = enabled;
        const { ACTIVE_CHAINS } = await import('../../src/utils/constants');
        const intervals: number[] = [];
        vi.doMock('../../src/utils/intervalTimer', () => ({
          default: class {
            /** Record fixture constructor arguments without initializing external clients. */
            constructor(interval: number) {
              intervals.push(interval);
            }
            start = () => undefined;
          },
        }));
        vi.useFakeTimers();
        const { runProcessors } = await import('../../src/jobs/runProcessors');
        runProcessors();
        expect(intervals).toHaveLength(ACTIVE_CHAINS.length);
        expect(ACTIVE_CHAINS.includes('bitcoin-cash')).toEqual(enabled);
        expect(networkConstructor).not.toHaveBeenCalled();
      },
    );
  });
});
