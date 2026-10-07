import GuardsBinanceConfigs from '../../src/configs/guardsBinanceConfigs';
import GuardsEthereumConfigs from '../../src/configs/guardsEthereumConfigs';
import { initScanner } from '../../src/jobs/initScanner';

const evmRpcNetworkCalls = vi.hoisted(
  (): Array<{ url: string; timeout?: number; authToken?: string }> => [],
);

// Mock the scanner/network modules so initScanner can run without real
// scanners, extractors or network connections. The EvmRpcNetwork mock only
// records the arguments it is constructed with.
vi.mock('@rosen-bridge/evm-scanner', () => ({
  EvmRpcNetwork: class {
    constructor(url: string, timeout?: number, authToken?: string) {
      evmRpcNetworkCalls.push({ url, timeout, authToken });
    }
  },
  EvmRpcScanner: class {
    registerExtractor = vi.fn();
    update = vi.fn(() => new Promise(() => undefined));
  },
}));

vi.mock('@rosen-bridge/ergo-scanner', () => ({
  ErgoScanner: class {
    registerExtractor = vi.fn();
    update = vi.fn(() => new Promise(() => undefined));
  },
  ErgoNodeNetwork: class {},
  ErgoExplorerNetwork: class {},
}));

vi.mock('@rosen-bridge/watcher-data-extractor', () => ({
  CommitmentExtractor: class {},
  EventTriggerExtractor: class {},
}));

vi.mock('@rosen-bridge/evm-address-tx-extractor', () => ({
  EvmTxExtractor: class {},
}));

describe('initScanner', () => {
  beforeAll(() => {
    initScanner();
  });

  /**
   * @target initScanner should pass the Ethereum RPC timeout to
   * EvmRpcNetwork in milliseconds
   * @dependencies
   * @scenario
   * - run initScanner with the test configs (ethereum.rpc.timeout is
   *   configured in seconds, like every time-related config)
   * - inspect the arguments the EvmRpcNetwork mock was constructed with
   * @expected
   * - the Ethereum network should be constructed exactly once
   * - its timeout should be the configured seconds converted to
   *   milliseconds, since ethers (used by EvmRpcNetwork) expects ms
   */
  it('should pass the Ethereum RPC timeout in milliseconds', () => {
    // initScanner constructs the Ethereum network before the Binance one;
    // the test configs give both chains the same (empty) RPC url, so the
    // calls are told apart by construction order
    expect(evmRpcNetworkCalls).toHaveLength(2);
    expect(evmRpcNetworkCalls[0].url).toEqual(GuardsEthereumConfigs.rpc.url);
    expect(evmRpcNetworkCalls[0].timeout).toEqual(
      GuardsEthereumConfigs.rpc.timeout * 1000,
    );
  });

  /**
   * @target initScanner should pass the Binance RPC timeout to
   * EvmRpcNetwork in milliseconds
   * @dependencies
   * @scenario
   * - run initScanner with the test configs (binance.rpc.timeout is
   *   configured in seconds, like every time-related config)
   * - inspect the arguments the EvmRpcNetwork mock was constructed with
   * @expected
   * - the Binance network should be constructed exactly once
   * - its timeout should be the configured seconds converted to
   *   milliseconds, since ethers (used by EvmRpcNetwork) expects ms
   */
  it('should pass the Binance RPC timeout in milliseconds', () => {
    expect(evmRpcNetworkCalls).toHaveLength(2);
    expect(evmRpcNetworkCalls[1].url).toEqual(GuardsBinanceConfigs.rpc.url);
    expect(evmRpcNetworkCalls[1].timeout).toEqual(
      GuardsBinanceConfigs.rpc.timeout * 1000,
    );
  });
});
