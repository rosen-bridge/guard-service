import originalConfig from 'config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenMap } from '@rosen-bridge/tokens';

import { rosenConfig as originalRosenConfig } from '../../src/configs/rosenConfig';
import {
  bchContract,
  bchTokenMap,
  bchValues,
  bchLock,
} from '../configs/bitcoinCashFixtures';

describe('production BCH registration and balance join', () => {
  let values: Record<string, unknown>;
  let tokens: TokenMap;
  const contractReader = vi.fn((chain: string) =>
    chain === 'bitcoin-cash'
      ? bchContract()
      : originalRosenConfig.contractReader(
          chain as Parameters<typeof originalRosenConfig.contractReader>[0],
        ),
  );
  const networkConstructor = vi.fn();
  const wrapCurve = vi.fn((_chainCode: string, _derivationPath: number[]) => ({
    sign: vi.fn(),
    isInSign: vi.fn(),
  }));
  const fakeNetwork = {
    logger: undefined,
    getAddressAssets: vi.fn(async () => ({ nativeToken: 123n, tokens: [] })),
  };
  const mocks: string[] = [];
  beforeEach(async () => {
    vi.resetModules();
    values = bchValues();
    tokens = await bchTokenMap();
    contractReader.mockClear();
    networkConstructor.mockClear();
    wrapCurve.mockClear();
    const { DefaultLogger, DummyLogger } = await import(
      '@rosen-bridge/abstract-logger'
    );
    DefaultLogger.init(new DummyLogger());
    fakeNetwork.getAddressAssets.mockClear();
    vi.doMock('config', () => ({
      default: {
        has: (key: string) =>
          Object.hasOwn(values, key) || originalConfig.has(key),
        get: (key: string) =>
          Object.hasOwn(values, key) ? values[key] : originalConfig.get(key),
      },
    }));
    vi.doMock('../../src/configs/rosenConfig', () => ({
      rosenConfig: { ...originalRosenConfig, contractReader },
    }));
    vi.doMock('../../src/handlers/tokenHandler', () => ({
      TokenHandler: { getInstance: () => ({ getTokenMap: () => tokens }) },
    }));
    vi.doMock('../../src/handlers/tssHandler', () => ({
      default: {
        getInstance: () => ({
          wrapCurveSignMediator: wrapCurve,
          wrapEdwardSignMediator: vi.fn(() => ({
            sign: vi.fn(),
            isInSign: vi.fn(),
          })),
        }),
      },
    }));
    vi.doMock('../../src/handlers/multiSigHandler', () => ({
      default: {
        getInstance: () => ({
          getErgoMultiSig: () => ({ sign: vi.fn(), isInSign: vi.fn() }),
        }),
      },
    }));
    vi.doMock('@rosen-chains/bitcoin-cash-rpc', () => ({
      BitcoinCashRpcNetwork: class {
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
  const handler = async () => {
    const { default: ChainHandler } = await vi.importActual<
      typeof import('../../src/handlers/chainHandler')
    >('../../src/handlers/chainHandler');
    return ChainHandler.getInstance();
  };
  it('disabled production startup reads no BCH contract and creates no BCH network or TSS mediator', async () => {
    values = { 'bitcoinCash.enabled': false };
    const chains = await handler();
    expect(() => chains.getChain('bitcoin-cash')).toThrow('disabled');
    expect(
      contractReader.mock.calls.some(([chain]) => chain === 'bitcoin-cash'),
    ).toBe(false);
    expect(networkConstructor).not.toHaveBeenCalled();
    expect(
      wrapCurve.mock.calls.some((args) => args[0] === 'SyntheticBchChainCode'),
    ).toBe(false);
  });
  it('constructs the actual BCH chain with validated policy, token map, RPC and TSS derivation', async () => {
    const chains = await handler();
    const bch = chains.getChain('bitcoin-cash');
    const { BitcoinCashChain } = await import('@rosen-chains/bitcoin-cash');
    expect(bch).toBeInstanceOf(BitcoinCashChain);
    expect(bch.getChainConfigs().addresses.lock).toBe(bchLock);
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
      contractReader.mock.calls.filter(([chain]) => chain === 'bitcoin-cash'),
    ).toHaveLength(1);
  });
  it('enabled malformed policy fails before BCH network and mediator construction', async () => {
    values['bitcoinCash.minimumUtxoValue'] = '545';
    await expect(handler()).rejects.toThrow('satoshi');
    expect(networkConstructor).not.toHaveBeenCalled();
    expect(
      wrapCurve.mock.calls.some((args) => args[0] === 'SyntheticBchChainCode'),
    ).toBe(false);
  });
  it('native BCH balances use the rpc batch configuration and bch token id', async () => {
    const chains = await handler();
    vi.doMock('../../src/handlers/chainHandler', () => ({
      default: { getInstance: () => chains },
    }));
    const upsert = vi.fn(async () => undefined);
    vi.doMock('../../src/db/databaseAction', () => ({
      DatabaseAction: {
        getInstance: () => ({ upsertChainAddressBalances: upsert }),
      },
    }));
    const { default: BalanceHandler } = await import(
      '../../src/handlers/balanceHandler'
    );
    class InspectBalanceHandler extends BalanceHandler {
      constructor() {
        super();
      }
      bchBatch = () => this.chainsTokensPerIteration['bitcoin-cash'];
    }
    expect(new InspectBalanceHandler().bchBatch()).toBe(1);
    BalanceHandler.init();
    const balances =
      await BalanceHandler.getInstance().updateChainBatchBalances(
        'bitcoin-cash',
        bchLock,
      );
    expect(balances).toEqual([
      expect.objectContaining({
        chain: 'bitcoin-cash',
        address: bchLock,
        tokenId: 'bch',
        balance: 123n,
      }),
    ]);
    expect(upsert).toHaveBeenCalledWith(balances);
    vi.doUnmock('../../src/handlers/chainHandler');
    vi.doUnmock('../../src/db/databaseAction');
  });
  it.each([false, true])(
    'schedules balance and cold-storage runtime jobs only for active chains with BCH enabled %s',
    async (enabled) => {
      values['bitcoinCash.enabled'] = enabled;
      const { ACTIVE_CHAINS } = await import('../../src/utils/constants');
      const intervals: number[] = [];
      vi.doMock('../../src/utils/intervalTimer', () => ({
        default: class {
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
      expect(ACTIVE_CHAINS.includes('bitcoin-cash')).toBe(enabled);
      const { default: ColdStorage } = await import(
        '../../src/coldStorage/coldStorage'
      );
      const process = vi
        .spyOn(ColdStorage, 'chainColdStorageProcess')
        .mockResolvedValue(undefined);
      await ColdStorage.processLockAddressAssets();
      expect(process.mock.calls.map(([chain]) => chain)).toEqual(ACTIVE_CHAINS);
      expect(networkConstructor).not.toHaveBeenCalled();
      process.mockRestore();
    },
  );
});
