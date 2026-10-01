import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  enabled: false,
  reads: 0,
  network: 'node',
  loggerNames: [] as string[],
  registered: [] as { kind: string; args: unknown[] }[],
  constructed: [] as { kind: string; args: unknown[] }[],
  dataSource: { fixture: 'data-source' },
  tokenMap: { fixture: 'token-map' },
  contract: {
    addresses: {
      Commitment: 'bch-commitment',
      WatcherTriggerEvent: 'bch-trigger',
      WatcherPermit: 'bch-permit',
      Fraud: 'bch-fraud',
      guardSign: 'bch-guard-sign',
    },
    tokens: { RWTId: 'bch-rwt' },
  },
}));

vi.mock('@rosen-bridge/abstract-logger', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@rosen-bridge/abstract-logger')>();
  const logger = {
    warn: vi.fn(),
    child: (name: string) => {
      state.loggerNames.push(name);
      return { name };
    },
  };
  return { ...actual, DefaultLogger: { getInstance: () => logger } };
});
vi.mock('@rosen-bridge/ergo-scanner', () => ({
  ErgoNodeNetwork: class {
    constructor(readonly url: string) {}
  },
  ErgoExplorerNetwork: class {
    constructor(readonly url: string) {}
  },
  ErgoScanner: class {
    registerExtractor(extractor: { kind: string; args: unknown[] }) {
      state.registered.push(extractor);
    }
    update() {
      return new Promise<void>(() => undefined);
    }
  },
}));
vi.mock('@rosen-bridge/watcher-data-extractor', () => ({
  CommitmentExtractor: class {
    kind = 'commitment';
    constructor(...args: unknown[]) {
      this.args = args;
      state.constructed.push(this);
    }
    args: unknown[];
  },
  EventTriggerExtractor: class {
    kind = 'event';
    constructor(...args: unknown[]) {
      this.args = args;
      state.constructed.push(this);
    }
    args: unknown[];
  },
}));
vi.mock('@rosen-bridge/evm-scanner', () => ({
  EvmRpcNetwork: class {},
  EvmRpcScanner: class {},
}));
vi.mock('@rosen-bridge/evm-address-tx-extractor', () => ({
  EvmTxExtractor: class {},
}));
vi.mock('../../src/configs/guardsBitcoinCashConfigs', () => ({
  default: {
    get enabled() {
      return state.enabled;
    },
    get bitcoinCashContractConfig() {
      state.reads++;
      if (!state.enabled) throw Error('Disabled contract must not be read');
      return state.contract;
    },
  },
}));
vi.mock('../../src/configs/configs', () => ({
  default: {
    initializeCommitments: true,
    initializeEventTriggers: false,
    scannersBlockCleanup: {
      isActiveForErgoChain: false,
      isActiveForNonErgoChains: false,
    },
  },
}));
vi.mock('../../src/db/dataSource', () => ({ dataSource: state.dataSource }));
vi.mock('../../src/handlers/tokenHandler', () => ({
  TokenHandler: { getInstance: () => ({ getTokenMap: () => state.tokenMap }) },
}));
vi.mock('../../src/utils/constants', () => ({
  DEFAULT_BLOCK_CLEANUP_THRESHOLD_DURATION: 10,
  DEFAULT_BLOCK_CLEANUP_TRIM: 1,
}));

describe('opt-in Bitcoin Cash Ergo ingestion', () => {
  beforeEach(() => {
    vi.resetModules();
    state.enabled = false;
    state.reads = 0;
    state.network = 'node';
    state.loggerNames.length = 0;
    state.registered.length = 0;
    state.constructed.length = 0;
    const otherContract = {
      addresses: {
        Commitment: 'other-commitment',
        WatcherTriggerEvent: 'other-trigger',
        WatcherPermit: 'other-permit',
        Fraud: 'other-fraud',
      },
      tokens: { RWTId: 'other-rwt' },
    };
    for (const [module, property] of [
      ['guardsBitcoinConfigs', 'bitcoinContractConfig'],
      ['guardsDogeConfigs', 'dogeContractConfig'],
      ['guardsCardanoConfigs', 'cardanoContractConfig'],
      ['guardsFiroConfigs', 'firoContractConfig'],
      ['guardsHandshakeConfigs', 'handshakeContractConfig'],
      ['guardsBitcoinRunesConfigs', 'bitcoinRunesContractConfig'],
      ['guardsEthereumConfigs', 'ethereumContractConfig'],
      ['guardsBinanceConfigs', 'binanceContractConfig'],
    ])
      vi.doMock(`../../src/configs/${module}`, () => ({
        default: { [property]: otherContract, chainNetworkName: 'disabled' },
      }));
    vi.doMock('../../src/configs/guardsErgoConfigs', () => ({
      default: {
        ergoContractConfig: otherContract,
        get chainNetworkName() {
          return state.network;
        },
        initialHeight: 0,
        node: { url: 'ergo-node' },
        explorer: { url: 'ergo-explorer' },
        scannerInterval: 100,
      },
    }));
  });
  afterEach(() => {
    for (const module of [
      'guardsBitcoinConfigs',
      'guardsDogeConfigs',
      'guardsCardanoConfigs',
      'guardsFiroConfigs',
      'guardsHandshakeConfigs',
      'guardsBitcoinRunesConfigs',
      'guardsEthereumConfigs',
      'guardsBinanceConfigs',
      'guardsErgoConfigs',
    ])
      vi.doUnmock(`../../src/configs/${module}`);
  });
  const initialize = async () =>
    (await import('../../src/jobs/initScanner')).initScanner();
  const bch = () =>
    state.registered.filter((extractor) =>
      String(extractor.args[0]).startsWith('bitcoinCash'),
    );
  it('does not read BCH contracts or construct BCH extractors and loggers when disabled', async () => {
    await initialize();
    expect(state.reads).toBe(0);
    expect(bch()).toEqual([]);
    expect(
      state.constructed.filter((extractor) =>
        String(extractor.args[0]).startsWith('bitcoinCash'),
      ),
    ).toEqual([]);
    expect(
      state.loggerNames.filter((name) => name.startsWith('bitcoin-cash')),
    ).toEqual([]);
    expect(state.registered).toHaveLength(18);
  });
  it.each(['node', 'explorer'])(
    'registers the exact BCH contract pair using the Ergo %s network',
    async (network) => {
      state.enabled = true;
      state.network = network;
      await initialize();
      const extractors = bch();
      expect(state.reads).toBe(1);
      expect(extractors).toHaveLength(2);
      expect(state.registered).toHaveLength(20);
      expect(extractors[0]).toEqual({
        kind: 'commitment',
        args: [
          'bitcoinCashCommitment',
          ['bch-commitment'],
          'bch-rwt',
          state.dataSource,
          state.tokenMap,
          {
            active: true,
            type: network,
            url: `ergo-${network}`,
            address: 'bch-commitment',
          },
          { name: 'bitcoin-cash-commitment-extractor' },
        ],
      });
      expect(extractors[1]).toEqual({
        kind: 'event',
        args: [
          'bitcoinCashEventTrigger',
          state.dataSource,
          network,
          `ergo-${network}`,
          'bch-trigger',
          'bch-rwt',
          'bch-permit',
          'bch-fraud',
          { name: 'bitcoin-cash-event-trigger-extractor' },
          false,
        ],
      });
      expect(
        state.loggerNames.filter((name) => name.startsWith('bitcoin-cash')),
      ).toEqual([
        'bitcoin-cash-commitment-extractor',
        'bitcoin-cash-event-trigger-extractor',
      ]);
    },
  );
});
