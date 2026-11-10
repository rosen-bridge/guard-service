import bchRegistration_originalConfig from 'config';

import { TokenMap } from '@rosen-bridge/tokens';
import { TokenMap as bchRegistration_TokenMap } from '@rosen-bridge/tokens';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { DOGE_CHAIN } from '@rosen-chains/doge';

import { rosenConfig as bchRegistration_originalRosenConfig } from '../../src/configs/rosenConfig';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { SUPPORTED_CHAINS } from '../../src/utils/constants';
import {
  bchContract as bchRegistration_bchContract,
  bchTokenMap as bchRegistration_bchTokenMap,
  bchValues as bchRegistration_bchValues,
  bchLock as bchRegistration_bchLock,
} from '../configs/bitcoinCashTestUtils';
import { createBitcoinCashConfigMock } from '../configs/mocked/guardsBitcoinCashConfigs.mock';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import ChainHandlerMock from './chainHandler.mock';
import TestBalanceHandler from './testBalanceHandler';
import {
  cardanoCometTokenId,
  cardanoLockAddress,
  cardanoTokenIds,
  mockAddressBalance,
  mockAddressBalance2,
  mockAddressBalance3,
  mockBalances,
  mockCardanoBalances,
  mockPartialCardanoBalances,
} from './testData';

describe('BalanceHandler', () => {
  const balanceHandler = new TestBalanceHandler();

  describe('getNativeTokenBalances', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target getNativeTokenBalances should return an empty array when database is empty
     * @dependencies
     * - DatabaseAction
     * @scenario
     * - call getNativeTokenBalances
     * @expected
     * - getNativeTokenBalances should have resolved to an empty array
     */
    it('should return an empty array when database is empty', async () => {
      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getNativeTokenBalances should return balances when database is not empty
     * @dependencies
     * - DatabaseAction
     * @scenario
     * - populate database with 4 mock ChainAddressBalanceEntity objects
     * - call getNativeTokenBalances
     * @expected
     * - getNativeTokenBalances should have resolved to an array of 2 native token balances for bitcoin and cardano
     */
    it('should return balances when database is not empty', async () => {
      // arrange
      // populate database with mock balance records
      for (const chain of Object.keys(mockBalances)) {
        for (const balance of mockBalances[chain]) {
          await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
        }
      }

      // act
      const result = await balanceHandler.getNativeTokenBalances();

      // assert
      expect(result).toEqual(mockAddressBalance3);
    });
  });

  describe('getChainTokenIds', () => {
    /**
     * @target getChainTokenIds should return empty array when token map is empty
     * @dependencies
     * - TokensMap
     * @scenario
     * - stub TokenMap.getConfig to return empty array
     * - call getChainTokenIds with CARDANO_CHAIN
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when token map is empty', () => {
      // arrange
      vi.spyOn(TokenHandler.getInstance(), 'getTokenMap').mockReturnValueOnce({
        getConfig: () => [],
      } as unknown as TokenMap);

      // act
      const result = balanceHandler.callGetChainTokenIds(CARDANO_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokenIds should return empty array when no tokens exist for specified chain
     * @dependencies
     * - TokensMap
     * @scenario
     * - call getChainTokenIds with DOGE_CHAIN
     * @expected
     * - result should have been an empty array
     */
    it('should return empty array when no tokens exist for specified chain', () => {
      // act
      const result = balanceHandler.callGetChainTokenIds(DOGE_CHAIN);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target getChainTokenIds should return non-native token ids of chain when it has both of the token types
     * @dependencies
     * - TokensMap
     * @scenario
     * - call getChainTokenIds with CARDANO_CHAIN
     * @expected
     * - result length should have been equal to 6
     * - result should have contained all the other 6 tokens of tokensMap that cardano supports except ada
     */
    it('should return non-native token ids of chain when it has both of the token types', () => {
      // act
      const result = balanceHandler.callGetChainTokenIds(CARDANO_CHAIN);

      // assert
      expect(result).toHaveLength(6);
      expect(result).toContain(
        'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
      );
      expect(result).toContain(
        'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
      );
      expect(result).toContain(
        'a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59',
      );
      expect(result).toContain(
        '45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48',
      );
      expect(result).toContain(
        '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
      );
      expect(result).toContain(
        'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
      );
      expect(result).not.toContain(ADA);
    });
  });

  describe('getAddressAssets', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();

      await DatabaseActionMock.clearTables();

      // populate database with mock balance records
      for (const chain of Object.keys(mockBalances)) {
        for (const balance of mockBalances[chain]) {
          await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
        }
      }

      for (const chain of SUPPORTED_CHAINS) {
        ChainHandlerMock.mockChainName(chain);
        ChainHandlerMock.mockChainFunction(
          chain,
          'getChainConfigs',
          {
            addresses: {
              lock: `${chain}_mock_lock_address`,
              cold: `${chain}_mock_cold_address`,
            },
          },
          false,
        );
      }
    });

    /**
     * @target getAddressAssets should successfully read balance records of cold addresses from database
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig for supported chains
     * - populate database with 4 mock ChainAddressBalanceEntity objects for lock and cold addresses
     * - call getAddressAssets
     * @expected
     * - getAddressAssets should have resolved to an array of 3 AddressBalance objects corresponding to cold addresses of cardano and bitcoin
     */
    it('should successfully read balance records of cold addresses from database', async () => {
      // act
      const result = await balanceHandler.getAddressAssets(
        'cold',
        undefined, // chain,
        undefined, // tokenId,
        0, // offset,
        10, // limit
      );

      // assert
      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.items).toEqual(mockAddressBalance);
    });

    /**
     * @target getAddressAssets should successfully read balance records of lock addresses from database
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig for supported chains
     * - populate database with 4 mock ChainAddressBalanceEntity objects for lock and cold addresses
     * - call getAddressAssets
     * @expected
     * - getAddressAssets should have resolved to an array of 1 AddressBalance object corresponding to lockAddress
     */
    it('should successfully read balance records of lock addresses from database', async () => {
      // act
      const result = await balanceHandler.getAddressAssets(
        'lock',
        undefined, // chain
        undefined, // tokenId
        0, // offset
        10, // limit
      );

      // assert
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items).toEqual(mockAddressBalance2);
    });
  });

  describe('updateChainBatchBalances', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();

      await DatabaseActionMock.clearTables();

      // populate database with mock balance records
      for (const chain of Object.keys(mockBalances)) {
        for (const balance of mockBalances[chain]) {
          await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
        }
      }
    });

    /**
     * @target updateChainBatchBalances should update batch balances successfully
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - populate database with 4 mock ChainAddressBalanceEntity objects
     * - stub ChainHandler.getAddressAssets to resolve to a AssetBalance object with a non-native token
     * - call updateChainBatchBalances
     * @expected
     * - database should have contained 5 ChainAddressBalanceEntity objects (4 initial balances + 1 inserted and 1 updated balances)
     */
    it('should update batch balances successfully', async () => {
      // arrange
      const balance: AssetBalance = {
        nativeToken: 123n,
        tokens: [{ id: cardanoCometTokenId, value: 111n }],
      };

      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'getAddressAssets',
        balance,
        true,
      );

      // act
      await balanceHandler.updateChainBatchBalances(
        CARDANO_CHAIN,
        cardanoLockAddress,
        [cardanoCometTokenId],
      );

      // assert
      const mockGetAddressAssets = ChainHandlerMock.getChainMockedFunction(
        CARDANO_CHAIN,
        'getAddressAssets',
      );
      expect(mockGetAddressAssets).toHaveBeenCalledExactlyOnceWith(
        cardanoLockAddress,
        [cardanoCometTokenId],
      );

      const balances = await DatabaseActionMock.allChainAddressBalanceRecords();
      expect(balances).toHaveLength(5);
      expect(balances[0]).toEqual(mockBalances[BITCOIN_CHAIN][0]);
      expect(balances[1]).toEqual(mockBalances[CARDANO_CHAIN][0]);
      expect(balances[2]).toEqual(mockBalances[CARDANO_CHAIN][1]);
      expect(balances[3]).toEqual({
        chain: CARDANO_CHAIN,
        address: cardanoLockAddress,
        tokenId: cardanoCometTokenId,
        lastUpdate: expect.any(String),
        balance: 111n,
      });
      expect(balances[4]).toEqual({
        chain: CARDANO_CHAIN,
        address: cardanoLockAddress,
        tokenId: ADA,
        lastUpdate: expect.any(String),
        balance: 123n,
      });
    });
  });

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
          () => ({
            ...values,
            balanceHandler: {
              ...bchRegistration_originalConfig.get<Record<string, unknown>>(
                'balanceHandler',
              ),
              bitcoinCash: {
                tokensPerIteration: {
                  rpc: values[
                    'balanceHandler.bitcoinCash.tokensPerIteration.rpc'
                  ],
                },
              },
            },
          }),
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
    /** Import the chain registry after the scenario mocks are installed. */
    const handler = async () => {
      const { default: ChainHandler } = await vi.importActual<
        typeof import('../../src/handlers/chainHandler')
      >('../../src/handlers/chainHandler');
      return ChainHandler.getInstance();
    };
    describe('updateChainBatchBalances', () => {
      /**
       * @target BalanceHandler.updateChainBatchBalances - native BCH balances
       * use the rpc batch configuration and bch token id
       * @dependencies Mocked operator config/contract, TokenHandler, TSS,
       * network, legacy-chain and balance database readers; actual BCH chain
       * and TokenMap.
       * @scenario native BCH balances use the rpc batch configuration and bch
       * token id.
       * @expected Use the native bch asset and RPC batching of 9999, then
       * persist the exact returned native balance with one network call.
       */
      it('native BCH balances use the rpc batch configuration and bch token id', async () => {
        const chains = await handler();
        vi.doMock('../../src/handlers/chainHandler', () => ({
          default: {
            /** Return the test singleton without production initialization. */
            getInstance: () => chains,
          },
        }));
        /** Record the exact balance row selected for persistence. */
        const upsert = vi.fn(async () => undefined);
        vi.doMock('../../src/db/databaseAction', () => ({
          DatabaseAction: {
            /** Return the test singleton without production initialization. */
            getInstance: () => ({ upsertChainAddressBalances: upsert }),
          },
        }));
        const { default: BalanceHandler } = await import(
          '../../src/handlers/balanceHandler'
        );
        class InspectBalanceHandler extends BalanceHandler {
          /** Record fixture constructor arguments without initializing external clients. */
          constructor() {
            super();
          }
          /** Read the configured BCH batch limit after real registration. */
          bchBatch = () => this.chainsTokensPerIteration['bitcoin-cash'];
        }
        expect(new InspectBalanceHandler().bchBatch()).toEqual(9999);
        BalanceHandler.init();
        const balances =
          await BalanceHandler.getInstance().updateChainBatchBalances(
            'bitcoin-cash',
            bchRegistration_bchLock,
          );
        expect(balances).toEqual([
          expect.objectContaining({
            chain: 'bitcoin-cash',
            address: bchRegistration_bchLock,
            tokenId: 'bch',
            balance: 123n,
          }),
        ]);
        expect(upsert).toHaveBeenCalledWith(balances);
        expect(fakeNetwork.getAddressAssets).toHaveBeenCalledExactlyOnceWith(
          bchRegistration_bchLock,
        );
        vi.doUnmock('../../src/handlers/chainHandler');
        vi.doUnmock('../../src/db/databaseAction');
      });
    });

    describe('updateChainBalances', () => {
      /**
       * @target BalanceHandler.updateChainBalances - preserves native-only
       * network consumption with a batch limit of %s
       * @dependencies Actual BalanceHandler, BCH chain, config and TokenMap;
       * owned mocked network, database, legacy chains and signing mediators
       * @scenario Configure one native BCH mapping and the selected batch
       * limit, then refresh both treasury and cold-storage balances
       * @expected Make exactly one asset request per address and persist two
       * native-only batches for both the old limit1 and RCS default9999
       */
      it.each([1, 9999])(
        'preserves native-only network consumption with a batch limit of %s',
        async (batch) => {
          values['balanceHandler.bitcoinCash.tokensPerIteration.rpc'] = batch;
          const chains = await handler();
          vi.doMock('../../src/handlers/chainHandler', () => ({
            default: {
              /** Return the initialized synthetic chain registry. */
              getInstance: () => chains,
            },
          }));
          /** Record native balance batches without accessing a database. */
          const upsert = vi.fn(async () => undefined);
          /** Record removal of stale balances without accessing a database. */
          const remove = vi.fn(async () => undefined);
          vi.doMock('../../src/db/databaseAction', () => ({
            DatabaseAction: {
              /** Return only the database operations owned by this fixture. */
              getInstance: () => ({
                /** Return an empty persisted-balance snapshot for this refresh. */
                getChainAddressBalanceByChain: vi.fn(async () => []),
                upsertChainAddressBalances: upsert,
                removeChainAddressBalances: remove,
              }),
            },
          }));
          const { default: BalanceHandler } = await import(
            '../../src/handlers/balanceHandler'
          );
          BalanceHandler.init();
          expect(
            BalanceHandler.getInstance()['chainsTokensPerIteration'][
              'bitcoin-cash'
            ],
          ).toEqual(batch);
          await BalanceHandler.getInstance().updateChainBalances(
            'bitcoin-cash',
          );
          const cold = bchRegistration_bchContract().addresses.cold;
          expect(fakeNetwork.getAddressAssets).toHaveBeenCalledTimes(2);
          expect(fakeNetwork.getAddressAssets).toHaveBeenNthCalledWith(
            1,
            bchRegistration_bchLock,
          );
          expect(fakeNetwork.getAddressAssets).toHaveBeenNthCalledWith(2, cold);
          expect(upsert).toHaveBeenCalledTimes(2);
          for (const [index, address] of [
            bchRegistration_bchLock,
            cold,
          ].entries())
            expect(upsert).toHaveBeenNthCalledWith(index + 1, [
              expect.objectContaining({
                chain: 'bitcoin-cash',
                address,
                tokenId: 'bch',
                balance: 123n,
              }),
            ]);
          expect(remove).toHaveBeenCalledExactlyOnceWith([]);
        },
      );
    });
  });

  describe('updateChainBalances', () => {
    beforeEach(async () => {
      ChainHandlerMock.resetMock();

      await DatabaseActionMock.clearTables();
    });

    /**
     * @target updateChainBalances should successfully update all balances of a chain
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig
     * - stub updateChainBatchBalances to resolve to an empty array
     * - call updateChainBalances
     * @expected
     * - updateChainBatchBalances should have been called 12 times for 2 addresses and 6 tokens each
     */
    it('should successfully update all balances of a chain', async () => {
      // arrange
      const chain = CARDANO_CHAIN;
      const lockAddress = `${chain}_mock_lock_address`;
      const coldAddress = `${chain}_mock_cold_address`;

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunction(
        chain,
        'getChainConfigs',
        {
          addresses: {
            lock: lockAddress,
            cold: coldAddress,
          },
        },
        false,
      );

      const updateChainBatchBalancesSpy = vi
        .spyOn(balanceHandler, 'updateChainBatchBalances')
        .mockResolvedValue([]);

      balanceHandler['chainsTokensPerIteration'][chain] = 1;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(updateChainBatchBalancesSpy).toHaveBeenCalledTimes(12);
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        1,
        chain,
        lockAddress,
        [
          'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        2,
        chain,
        lockAddress,
        [
          'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        3,
        chain,
        lockAddress,
        ['a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        4,
        chain,
        lockAddress,
        ['45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        5,
        chain,
        lockAddress,
        [
          '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        6,
        chain,
        lockAddress,
        [
          'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        7,
        chain,
        coldAddress,
        [
          'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        8,
        chain,
        coldAddress,
        [
          'bb2250e4c589539fd141fbbd2c322d380f1ce2aaef812cd87110d61b.527374434f4d4554565465737432',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        9,
        chain,
        coldAddress,
        ['a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        10,
        chain,
        coldAddress,
        ['45fdcb56b039bfba0028f350aaabe0508e4bb4d8c4d7c3c7d481c235.48'],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        11,
        chain,
        coldAddress,
        [
          '3122541486c983d637e7ed9330c94e490e1fe4a1758725fab7f6d9e0.72734254432d6c6f656e',
        ],
      );
      expect(updateChainBatchBalancesSpy).toHaveBeenNthCalledWith(
        12,
        chain,
        coldAddress,
        [
          'ac0a478c70238bff24e20107ebe399e7f3a3e854037622427206b024.72734d44546f6b656e2d6c6f656e',
        ],
      );
    });

    /**
     * @target updateChainBalances should skip updating empty addresses
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - stub ChainHandler getChainConfigs to return a mock chainConfig containing an empty cold address
     * - stub updateChainBatchBalances to resolve to an empty array
     * - call updateChainBalances
     * @expected
     * - updateChainBatchBalances should have been called once for lock address only
     */
    it('should skip updating empty addresses', async () => {
      // arrange
      const chain = CARDANO_CHAIN;
      const lockAddress = `${chain}_mock_lock_address`;
      const coldAddress = '';

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunction(
        chain,
        'getChainConfigs',
        {
          addresses: {
            lock: lockAddress,
            cold: coldAddress,
          },
        },
        false,
      );

      const updateChainBatchBalancesSpy = vi
        .spyOn(balanceHandler, 'updateChainBatchBalances')
        .mockResolvedValue([]);

      balanceHandler['chainsTokensPerIteration'][chain] = 100;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(updateChainBatchBalancesSpy).toHaveBeenCalledExactlyOnceWith(
        chain,
        lockAddress,
        cardanoTokenIds,
      );
    });

    /**
     * @target updateChainBalances should remove outdated balance records from database
     * @dependencies
     * - TokensMap
     * - ChainHandler
     * - DatabaseAction
     * @scenario
     * - spy on DatabaseAction.removeChainAddressBalances
     * - stub ChainHandler getChainConfigs to return a mock chainConfig
     * - insert 12 mock balance objects for lock and cold addresses into database
     * - stub updateChainBatchBalances to resolve to 4 mock objects for lock address only
     * - call updateChainBalances
     * @expected
     * - DatabaseAction.removeChainAddressBalances should have been called once
     * - database should have contained the 4 mock objects
     */
    it('should remove outdated balance records from database', async () => {
      // arrange
      const chain = CARDANO_CHAIN;
      const lockAddress = `${chain}_mock_lock_address`;
      const coldAddress = `${chain}_mock_cold_address`;

      const removeSpy = vi.spyOn(
        DatabaseActionMock.testDatabase,
        'removeChainAddressBalances',
      );

      for (const balance of mockCardanoBalances) {
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);
      }

      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockChainFunction(
        chain,
        'getChainConfigs',
        {
          addresses: {
            lock: lockAddress,
            cold: coldAddress,
          },
        },
        false,
      );

      vi.spyOn(balanceHandler, 'updateChainBatchBalances').mockImplementation(
        async (chain, address) => {
          if (address === lockAddress) return mockPartialCardanoBalances;
          return [];
        },
      );

      balanceHandler['chainsTokensPerIteration'][chain] = 100;

      // act
      await balanceHandler.updateChainBalances(chain);

      // assert
      expect(removeSpy).toHaveBeenCalledOnce();
      const records = await DatabaseActionMock.allChainAddressBalanceRecords();
      expect(records).toEqual(mockPartialCardanoBalances);
    });
  });
});
