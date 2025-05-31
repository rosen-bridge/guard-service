import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import fastify from 'fastify';
import { mockBalances, mockBalancesObj } from './testData';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import { FastifySeverInstance } from '../../src/api/schemas';
import GuardsBitcoinConfigs from '../../src/configs/GuardsBitcoinConfigs';
import BalanceHandlerMock from '../handlers/mocked/BalanceHandler.mock';
import { balanceRoutes } from '../../src/api/balance';

vi.mock('../../src/utils/constants', async (importOriginal) => {
  const mod = await importOriginal<
    typeof import('../../src/utils/constants')
  >();
  return {
    ...mod,
    SUPPORTED_CHAINS: [ERGO_CHAIN, CARDANO_CHAIN, BITCOIN_CHAIN],
  };
});

describe('balanceRoutes', () => {
  describe('GET /balance', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(() => {
      mockedServer = fastify();
      mockedServer.register(balanceRoutes);
      ChainHandlerMock.resetMock();

      BalanceHandlerMock.resetMock();

      ChainHandlerMock.mockChainName(ERGO_CHAIN);
      ChainHandlerMock.mockChainFunction(
        ERGO_CHAIN,
        'getChainConfigs',
        {
          addresses: {
            lock: GuardsErgoConfigs.chainConfigs.addresses.lock,
            cold: GuardsErgoConfigs.chainConfigs.addresses.cold,
          },
        },
        false
      );

      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'getChainConfigs',
        {
          addresses: {
            lock: GuardsCardanoConfigs.chainConfigs.addresses.lock,
            cold: GuardsCardanoConfigs.chainConfigs.addresses.cold,
          },
        },
        false
      );

      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      ChainHandlerMock.mockChainFunction(
        BITCOIN_CHAIN,
        'getChainConfigs',
        {
          addresses: {
            lock: GuardsBitcoinConfigs.chainConfigs.addresses.lock,
            cold: GuardsBitcoinConfigs.chainConfigs.addresses.cold,
          },
        },
        false
      );
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /balance] should return lock balance with hot and cold arrays populated
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getBalances to return mock balances
     * - call handler
     * @expected
     * - response status should have been 200
     * - response should have matched hot and cold balances from mockBalances
     */
    it('should return lock balance with hot and cold arrays populated', async () => {
      // arrange
      BalanceHandlerMock.mock();
      BalanceHandlerMock.mockGetBalances().mockResolvedValue(mockBalances);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual(mockBalancesObj);
    });

    /**
     * @target fastifyServer[GET /balance] should return empty lock balance when no balances are returned
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getBalances to return mock balances
     * - call handler
     * @expected
     * - response status should have been 200
     * - response balance arrays should have been an empty
     */
    it('should return empty lock balance when no balances are returned', async () => {
      // arrange
      BalanceHandlerMock.mock();
      BalanceHandlerMock.mockGetBalances().mockResolvedValue([]);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({ hot: [], cold: [] });
    });

    /**
     * @target fastifyServer[GET /balance] should return error response when an exception is thrown during balance retrieval
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getBalances to reject
     * - call handler
     * @expected
     * - response status should have been 500
     * - response should have matched the correct error message
     */
    it('should return error response when an exception is thrown during balance retrieval', async () => {
      // arrange
      BalanceHandlerMock.mock();
      BalanceHandlerMock.mockGetBalances().mockImplementation(() => {
        throw new Error('error');
      });

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(500);
      expect(result.json()).toEqual({
        message: 'error',
      });
    });
  });
});
