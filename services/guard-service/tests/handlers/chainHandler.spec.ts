import bchRegistration_originalConfig from 'config';

import { TokenMap as bchRegistration_TokenMap } from '@rosen-bridge/tokens';

import { rosenConfig as bchRegistration_originalRosenConfig } from '../../src/configs/rosenConfig';
import {
  bchContract as bchRegistration_bchContract,
  bchTokenMap as bchRegistration_bchTokenMap,
  bchValues as bchRegistration_bchValues,
  bchLock as bchRegistration_bchLock,
} from '../configs/bitcoinCashFixtures';
import { createBitcoinCashConfigMock } from '../configs/mocked/guardsBitcoinCashConfigs.mock';

describe('ChainHandler', () => {
  describe('getInstance', () => {
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
        vi.doMock('@rosen-chains/bitcoin-cash-rpc', () => ({
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
      /** Import the chain registry after the scenario mocks are installed. */
      const handler = async () => {
        const { default: ChainHandler } = await vi.importActual<
          typeof import('../../src/handlers/chainHandler')
        >('../../src/handlers/chainHandler');
        return ChainHandler.getInstance();
      };
      /**
       * @target ChainHandler.getInstance - disabled production startup reads
       * no BCH contract and creates no BCH network or TSS mediator
       * @dependencies Mocked operator config/contract, TokenHandler, TSS,
       * network, legacy-chain and balance database readers; actual BCH chain
       * and TokenMap.
       * @scenario disabled production startup reads no BCH contract and
       * creates no BCH network or TSS mediator.
       * @expected Construct exactly one opted-in BCH chain from the validated
       * policy/TSS path; avoid BCH consumers while disabled or when policy
       * validation fails.
       */
      it('disabled production startup reads no BCH contract and creates no BCH network or TSS mediator', async () => {
        values = { 'bitcoinCash.enabled': false };
        const chains = await handler();
        expect(() => chains.getChain('bitcoin-cash')).toThrow('disabled');
        expect(
          contractReader.mock.calls.some(([chain]) => chain === 'bitcoin-cash'),
        ).toEqual(false);
        expect(networkConstructor).not.toHaveBeenCalled();
        expect(
          wrapCurve.mock.calls.some(
            (args) => args[0] === 'SyntheticBchChainCode',
          ),
        ).toEqual(false);
      });
      /**
       * @target ChainHandler.getInstance - constructs the actual BCH chain
       * with validated policy, token map, RPC and TSS derivation
       * @dependencies Mocked operator config/contract, TokenHandler, TSS,
       * network, legacy-chain and balance database readers; actual BCH chain
       * and TokenMap.
       * @scenario constructs the actual BCH chain with validated policy, token
       * map, RPC and TSS derivation.
       * @expected Construct exactly one opted-in BCH chain from the validated
       * policy/TSS path; avoid BCH consumers while disabled or when policy
       * validation fails.
       */
      it('constructs the actual BCH chain with validated policy, token map, RPC and TSS derivation', async () => {
        const chains = await handler();
        const bch = chains.getChain('bitcoin-cash');
        const { BitcoinCashChain } = await import('@rosen-chains/bitcoin-cash');
        expect(bch).toBeInstanceOf(BitcoinCashChain);
        expect(bch.getChainConfigs().addresses.lock).toEqual(
          bchRegistration_bchLock,
        );
        expect(networkConstructor).toHaveBeenCalledExactlyOnceWith({
          url: values['bitcoinCash.rpc.url'],
          expectedChain: 'regtest',
          timeoutMs: 5000,
          walletHistoryPageSize: 100,
          maxWalletHistoryPages: 20,
        });
        expect(wrapCurve).toHaveBeenCalledWith(
          'SyntheticBchChainCode',
          [44, 145, 0, 0],
        );
        expect(
          contractReader.mock.calls.filter(
            ([chain]) => chain === 'bitcoin-cash',
          ),
        ).toHaveLength(1);
      });
      /**
       * @target ChainHandler.getInstance - enabled malformed policy fails
       * before BCH network and mediator construction
       * @dependencies Mocked operator config/contract, TokenHandler, TSS,
       * network, legacy-chain and balance database readers; actual BCH chain
       * and TokenMap.
       * @scenario enabled malformed policy fails before BCH network and
       * mediator construction.
       * @expected Construct exactly one opted-in BCH chain from the validated
       * policy/TSS path; avoid BCH consumers while disabled or when policy
       * validation fails.
       */
      it('enabled malformed policy fails before BCH network and mediator construction', async () => {
        values['bitcoinCash.minimumUtxoValue'] = '545';
        await expect(handler()).rejects.toThrow('satoshi');
        expect(networkConstructor).not.toHaveBeenCalled();
        expect(
          wrapCurve.mock.calls.some(
            (args) => args[0] === 'SyntheticBchChainCode',
          ),
        ).toEqual(false);
      });
    });
  });
});
