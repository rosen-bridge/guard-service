import fastify from 'fastify';

import { balanceRoutes } from '../../src/api/balance';
import { FastifySeverInstance } from '../../src/api/schemas';
import { rosenConfig } from '../../src/configs/rosenConfig';
import { SUPPORTED_CHAINS } from '../../src/utils/constants';
import ChainHandlerMock from '../handlers/chainHandler.mock';
import BalanceHandlerMock from '../handlers/mocked/balanceHandler.mock';
import {
  mockLockBalances,
  mockColdBalances,
  mockBalancesObj,
} from './testData';

describe('balanceRoutes', () => {
  describe('GET /balance', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(() => {
      mockedServer = fastify();
      mockedServer.register(balanceRoutes);

      BalanceHandlerMock.resetMock();
      BalanceHandlerMock.mock();

      ChainHandlerMock.resetMock();

      for (const chain of SUPPORTED_CHAINS) {
        ChainHandlerMock.mockChainName(chain);
        ChainHandlerMock.mockChainFunction(
          chain,
          'getChainConfigs',
          {
            addresses: {
              lock: rosenConfig.contractReader(chain).addresses.lock,
              cold: rosenConfig.contractReader(chain).addresses.cold,
            },
          },
          false,
        );
      }
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /balance] should return lock balance with hot and cold arrays populated
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getAddressAssets to return mock balances for both lock and cold addresses
     * - call handler
     * @expected
     * - response status should have been 200
     * - response should have matched hot and cold balances from mockBalances
     */
    it('should return lock balance with hot and cold arrays populated', async () => {
      // arrange
      BalanceHandlerMock.mockGetAddressAssets().mockImplementation(
        async () => ({
          items: [...mockLockBalances.items, ...mockColdBalances.items],
          total: mockLockBalances.total + mockColdBalances.total,
        }),
      );

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.json()).toEqual(mockBalancesObj);
      expect(result.statusCode).toEqual(200);
    });

    /**
     * @target fastifyServer[GET /balance] should return empty lock balance when no balances are returned
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getAddressAssets to return empty array for both lock and cold addresses
     * - call handler
     * @expected
     * - response status should have been 200
     * - response balance arrays should have been an empty
     */
    it('should return empty lock balance when no balances are returned', async () => {
      // arrange
      BalanceHandlerMock.mockGetAddressAssets().mockResolvedValue({
        items: [],
        total: 0,
      });

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        hot: {
          items: [],
          total: 0,
        },
        cold: {
          items: [],
          total: 0,
        },
      });
    });

    /**
     * @target fastifyServer[GET /balance] should return error response when an exception is thrown during balance retrieval
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getAddressAssets to throw
     * - call handler
     * @expected
     * - response status should have been 500
     * - response should have matched the correct error message
     */
    it('should return error response when an exception is thrown during balance retrieval', async () => {
      // arrange
      BalanceHandlerMock.mockGetAddressAssets().mockImplementation(async () => {
        throw new Error('custom_error');
      });

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(500);
      expect(result.json()).toEqual({
        message: 'custom_error',
      });
    });
  });
});
