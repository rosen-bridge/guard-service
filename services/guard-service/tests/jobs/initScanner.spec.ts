describe('initScanner', () => {
  describe('BCH RCS bitcoinCashIngestion', () => {
    beforeEach(() => {
      vi.resetModules();
      bchIngestion_state.enabled = false;
      bchIngestion_state.reads = 0;
      bchIngestion_state.network = 'node';
      bchIngestion_state.loggerNames.length = 0;
      bchIngestion_state.registered.length = 0;
      bchIngestion_state.constructed.length = 0;
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
          default: {
            [property]: otherContract,
            chainNetworkName: 'disabled',
          },
        }));
      vi.doMock('../../src/configs/guardsErgoConfigs', () => ({
        default: {
          ergoContractConfig: otherContract,
          /** Read the mutable Ergo provider choice for the initialization fixture. */
          get chainNetworkName() {
            return bchIngestion_state.network;
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
    /** Import and invoke scanner initialization after the scenario mocks are installed. */
    const initialize = async () =>
      (await import('../../src/jobs/initScanner')).initScanner();
    /** Select only the BCH extractors registered by this initialization. */
    const bch = () =>
      bchIngestion_state.registered.filter((extractor) =>
        String(extractor.args[0]).startsWith('bitcoinCash'),
      );
    /**
     * @target initScanner - does not read BCH contracts or construct BCH
     * extractors and loggers when disabled
     * @dependencies Hoisted scanner, extractor, logger, contract, TokenMap
     * and database fixtures; mocked config modules.
     * @scenario does not read BCH contracts or construct BCH extractors and
     * loggers when disabled.
     * @expected Create no BCH consumers while disabled; register exactly the
     * BCH commitment and event extractors with the selected Ergo provider
     * while enabled.
     */
    it('does not read BCH contracts or construct BCH extractors and loggers when disabled', async () => {
      await initialize();
      expect(bchIngestion_state.reads).toEqual(0);
      expect(bch()).toEqual([]);
      expect(
        bchIngestion_state.constructed.filter((extractor) =>
          String(extractor.args[0]).startsWith('bitcoinCash'),
        ),
      ).toEqual([]);
      expect(
        bchIngestion_state.loggerNames.filter((name) =>
          name.startsWith('bitcoin-cash'),
        ),
      ).toEqual([]);
      expect(bchIngestion_state.registered).toHaveLength(18);
    });
    /**
     * @target initScanner - registers the exact BCH contract pair using the
     * Ergo %s network
     * @dependencies Hoisted scanner, extractor, logger, contract, TokenMap
     * and database fixtures; mocked config modules.
     * @scenario registers the exact BCH contract pair using the Ergo %s
     * network.
     * @expected Create no BCH consumers while disabled; register exactly the
     * BCH commitment and event extractors with the selected Ergo provider
     * while enabled.
     */
    it.each(['node', 'explorer'])(
      'registers the exact BCH contract pair using the Ergo %s network',
      async (network) => {
        bchIngestion_state.enabled = true;
        bchIngestion_state.network = network;
        await initialize();
        const extractors = bch();
        expect(bchIngestion_state.reads).toEqual(1);
        expect(extractors).toHaveLength(2);
        expect(bchIngestion_state.registered).toHaveLength(20);
        expect(extractors[0]).toEqual({
          kind: 'commitment',
          args: [
            'bitcoinCashCommitment',
            ['bch-commitment'],
            'bch-rwt',
            bchIngestion_state.dataSource,
            bchIngestion_state.tokenMap,
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
            bchIngestion_state.dataSource,
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
          bchIngestion_state.loggerNames.filter((name) =>
            name.startsWith('bitcoin-cash'),
          ),
        ).toEqual([
          'bitcoin-cash-commitment-extractor',
          'bitcoin-cash-event-trigger-extractor',
        ]);
      },
    );
  });
});

const bchIngestion_state = vi.hoisted(() => ({
  enabled: false,
  reads: 0,
  network: 'node',
  loggerNames: [] as string[],
  registered: [] as {
    kind: string;
    args: unknown[];
  }[],
  constructed: [] as {
    kind: string;
    args: unknown[];
  }[],
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
    /** Record the logger scope selected by initialization. */
    child: (name: string) => {
      bchIngestion_state.loggerNames.push(name);
      return { name };
    },
  };
  return {
    ...actual,
    DefaultLogger: {
      /** Return the test singleton without production initialization. */
      getInstance: () => logger,
    },
  };
});
vi.mock('@rosen-bridge/ergo-scanner', () => ({
  ErgoNodeNetwork: class {
    /** Record fixture constructor arguments without initializing external clients. */
    constructor(readonly url: string) {}
  },
  ErgoExplorerNetwork: class {
    /** Record fixture constructor arguments without initializing external clients. */
    constructor(readonly url: string) {}
  },
  ErgoScanner: class {
    /** Record the extractor selected by scanner initialization. */
    registerExtractor(extractor: { kind: string; args: unknown[] }) {
      bchIngestion_state.registered.push(extractor);
    }
    /** Keep scanner background work pending without any network request. */
    update() {
      return new Promise<void>(() => undefined);
    }
  },
}));
vi.mock('@rosen-bridge/watcher-data-extractor', () => ({
  CommitmentExtractor: class {
    kind = 'commitment';
    /** Record fixture constructor arguments without initializing external clients. */
    constructor(...args: unknown[]) {
      this.args = args;
      bchIngestion_state.constructed.push(this);
    }
    args: unknown[];
  },
  EventTriggerExtractor: class {
    kind = 'event';
    /** Record fixture constructor arguments without initializing external clients. */
    constructor(...args: unknown[]) {
      this.args = args;
      bchIngestion_state.constructed.push(this);
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
    /** Read the mutable BCH opt-in flag. */
    get enabled() {
      return bchIngestion_state.enabled;
    },
    /** Record and enforce enabled-only BCH contract access. */
    get bitcoinCashContractConfig() {
      bchIngestion_state.reads++;
      if (!bchIngestion_state.enabled)
        throw Error('Disabled contract must not be read');
      return bchIngestion_state.contract;
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
vi.mock('../../src/db/dataSource', () => ({
  dataSource: bchIngestion_state.dataSource,
}));
vi.mock('../../src/handlers/tokenHandler', () => ({
  TokenHandler: {
    /** Return the test singleton without production initialization. */
    getInstance: () => ({
      /** Return the mutable synthetic token map used by this scenario. */
      getTokenMap: () => bchIngestion_state.tokenMap,
    }),
  },
}));
vi.mock('../../src/utils/constants', () => ({
  DEFAULT_BLOCK_CLEANUP_THRESHOLD_DURATION: 10,
  DEFAULT_BLOCK_CLEANUP_TRIM: 1,
}));
