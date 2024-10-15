import { HealthStatusLevel } from '@rosen-bridge/health-check';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { guardInfo } from './testData';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { generalInfoRoute } from '../../src/api/generalInfo';
import fastify from 'fastify';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import { FastifySeverInstance } from '../../src/api/schemas';
import GuardsBitcoinConfigs from '../../src/configs/GuardsBitcoinConfigs';

vi.mock('../../src/utils/constants', async (importOriginal) => {
  const mod = await importOriginal<
    typeof import('../../src/utils/constants')
  >();
  return {
    ...mod,
    SUPPORTED_CHAINS: [ERGO_CHAIN, CARDANO_CHAIN, BITCOIN_CHAIN],
  };
});

describe('generalInfo', () => {
  describe('GET /info', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(() => {
      mockedServer = fastify();
      mockedServer.register(generalInfoRoute);
      ChainHandlerMock.resetMock();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /info] should return general info of the guard correctly
     * @dependencies
     * - ChainHandler
     * - HealthCheck
     * @scenario
     * - mock ChainHandler
     *   - mock Ergo functions
     *   - mock Cardano functions
     *   - mock Bitcoin functions
     * - mock healthCheck
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 200
     * - it should return general info of the guard correctly
     */
    it('should return general info of the guard correctly', async () => {
      // mock getChain function of ChainHandler
      //  mock Ergo functions
      const ergoLockBalance: AssetBalance = {
        nativeToken: 10n,
        tokens: [{ id: '1', value: 20n }],
      };
      const ergoColdBalance: AssetBalance = {
        nativeToken: 100n,
        tokens: [],
      };
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getLockAddressAssets',
        ergoLockBalance
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getColdAddressAssets',
        ergoColdBalance
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getChainConfigs',
        GuardsErgoConfigs.chainConfigs
      );

      //  mock Cardano functions
      const cardanoLockBalance: AssetBalance = {
        nativeToken: 20n,
        tokens: [{ id: '2', value: 40n }],
      };
      const cardanoColdBalance: AssetBalance = {
        nativeToken: 200n,
        tokens: [],
      };
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'getLockAddressAssets',
        cardanoLockBalance
      );
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'getColdAddressAssets',
        cardanoColdBalance
      );
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

      //  mock Bitcoin functions
      const bitcoinLockBalance: AssetBalance = {
        nativeToken: 30n,
        tokens: [],
      };
      const bitcoinColdBalance: AssetBalance = {
        nativeToken: 300n,
        tokens: [],
      };
      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      ChainHandlerMock.mockChainFunction(
        BITCOIN_CHAIN,
        'getLockAddressAssets',
        bitcoinLockBalance
      );
      ChainHandlerMock.mockChainFunction(
        BITCOIN_CHAIN,
        'getColdAddressAssets',
        bitcoinColdBalance
      );
      ChainHandlerMock.mockChainFunction(
        BITCOIN_CHAIN,
        'getChainConfigs',
        GuardsBitcoinConfigs.chainConfigs
      );

      // mock healthCheck
      vi.mock('../../src/guard/HealthCheck', () => {
        return {
          getHealthCheck: vi.fn().mockResolvedValue({
            getOverallHealthStatus: vi
              .fn()
              .mockResolvedValue(HealthStatusLevel.HEALTHY),
            getTrialErrors: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/info',
      });

      // check the result
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual(guardInfo);
    });
  });
});
