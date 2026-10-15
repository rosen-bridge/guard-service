import GuardsBinanceConfigs from '../../src/configs/guardsBinanceConfigs';
import GuardsEthereumConfigs from '../../src/configs/guardsEthereumConfigs';
import { getHealthCheck } from '../../src/guard/healthCheck';

const evmAssetCheckCalls = vi.hoisted((): Array<Array<unknown>> => []);

// Mock the asset-check params so getHealthCheck can run without real
// network clients. The EvmRpcAssetHealthCheckParam mock only records
// the arguments it is constructed with. Its timeout parameter (index 8)
// is handed to ethers, which expects milliseconds.
vi.mock('@rosen-bridge/asset-check', () => ({
  EsploraAssetHealthCheckParam: class {},
  CardanoBlockFrostAssetHealthCheckParam: class {},
  CardanoKoiosAssetHealthCheckParam: class {},
  ErgoExplorerAssetHealthCheckParam: class {},
  ErgoNodeAssetHealthCheckParam: class {},
  EvmRpcAssetHealthCheckParam: class {
    constructor(...args: Array<unknown>) {
      evmAssetCheckCalls.push(args);
    }
  },
}));

vi.mock('@rosen-bridge/health-check', () => ({
  HealthCheck: class {
    register = vi.fn();
  },
  HealthStatusLevel: {
    HEALTHY: 'Healthy',
    UNSTABLE: 'Unstable',
    BROKEN: 'Broken',
  },
}));

vi.mock('@rosen-bridge/log-level-check', () => ({
  LogLevelHealthCheck: class {},
}));

vi.mock('@rosen-bridge/node-sync-check', () => ({
  ErgoNodeSyncHealthCheckParam: class {},
}));

vi.mock('@rosen-bridge/scanner-sync-check', () => ({
  ScannerSyncHealthCheckParam: class {},
}));

vi.mock('@rosen-bridge/event-progress-check', () => ({
  EventProgressHealthCheckParam: class {},
}));

vi.mock('@rosen-bridge/tx-progress-check', () => ({
  TxProgressHealthCheckParam: class {},
}));

// NotificationHandler.getInstance throws until the handler is
// initialized, which getHealthCheck does not do itself
vi.mock('../../src/handlers/notificationHandler', () => ({
  NotificationHandler: {
    getInstance: () => ({
      notify: vi.fn(),
    }),
  },
}));

describe('getHealthCheck', () => {
  beforeAll(async () => {
    await getHealthCheck();
  });

  /**
   * @target getHealthCheck should pass the Ethereum RPC timeout to
   * EvmRpcAssetHealthCheckParam in milliseconds
   * @dependencies
   * @scenario
   * - run getHealthCheck with the test configs (ethereum.rpc.timeout is
   *   configured in seconds, like every time-related config)
   * - inspect the arguments the EvmRpcAssetHealthCheckParam mock was
   *   constructed with
   * @expected
   * - the Ethereum param should be constructed exactly once
   * - its timeout should be the configured rpc timeout converted to
   *   milliseconds, since ethers (used by the param) expects ms
   */
  it('should pass the Ethereum RPC timeout in milliseconds', () => {
    // getHealthCheck constructs the Ethereum param before the Binance
    // one; the test configs give both chains the same (empty) RPC url,
    // so the calls are told apart by construction order
    expect(evmAssetCheckCalls).toHaveLength(2);
    expect(evmAssetCheckCalls[0][7]).toEqual(GuardsEthereumConfigs.rpc.url);
    expect(evmAssetCheckCalls[0][8]).toEqual(
      GuardsEthereumConfigs.rpc.timeout * 1000,
    );
  });

  /**
   * @target getHealthCheck should pass the Binance RPC timeout to
   * EvmRpcAssetHealthCheckParam in milliseconds
   * @dependencies
   * @scenario
   * - run getHealthCheck with the test configs (binance.rpc.timeout is
   *   configured in seconds, like every time-related config)
   * - inspect the arguments the EvmRpcAssetHealthCheckParam mock was
   *   constructed with
   * @expected
   * - the Binance param should be constructed exactly once
   * - its timeout should be the configured rpc timeout converted to
   *   milliseconds, since ethers (used by the param) expects ms
   */
  it('should pass the Binance RPC timeout in milliseconds', () => {
    expect(evmAssetCheckCalls).toHaveLength(2);
    expect(evmAssetCheckCalls[1][7]).toEqual(GuardsBinanceConfigs.rpc.url);
    expect(evmAssetCheckCalls[1][8]).toEqual(
      GuardsBinanceConfigs.rpc.timeout * 1000,
    );
  });
});
