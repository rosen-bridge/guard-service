import fastify from 'fastify';
import {
  mockLockBalances,
  mockColdBalances,
  mockBalancesObj,
} from './testData';
import { FastifySeverInstance } from '../../src/api/schemas';
import BalanceHandlerMock from '../handlers/mocked/BalanceHandler.mock';
import { balanceRoutes } from '../../src/api/balance';

describe('balanceRoutes', () => {
  describe('GET /balance', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(() => {
      mockedServer = fastify();
      mockedServer.register(balanceRoutes);

      BalanceHandlerMock.resetMock();
      BalanceHandlerMock.mock();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /balance] should return lock balance with hot and cold arrays populated
     * @dependencies
     * @scenario
     * - stub BalanceHandler.getLockAddressAssets to return mock balances
     * - stub BalanceHandler.getColdAddressAssets to return mock balances
     * - call handler
     * @expected
     * - response status should have been 200
     * - response should have matched hot and cold balances from mockBalances
     */
    it('should return lock balance with hot and cold arrays populated', async () => {
      // arrange
      BalanceHandlerMock.mockGetLockAddressAssets().mockResolvedValue(
        mockLockBalances
      );
      BalanceHandlerMock.mockGetColdAddressAssets().mockResolvedValue(
        mockColdBalances
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
     * - stub BalanceHandler.getLockAddressAssets to return mock balances
     * - stub BalanceHandler.getColdAddressAssets to return mock balances
     * - call handler
     * @expected
     * - response status should have been 200
     * - response balance arrays should have been an empty
     */
    it('should return empty lock balance when no balances are returned', async () => {
      // arrange
      BalanceHandlerMock.mockGetLockAddressAssets().mockResolvedValue([]);
      BalanceHandlerMock.mockGetColdAddressAssets().mockResolvedValue([]);

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
     * - stub BalanceHandler.getLockAddressAssets to reject
     * - stub BalanceHandler.getColdAddressAssets to return mock balances
     * - call handler
     * @expected
     * - response status should have been 500
     * - response should have matched the correct error message
     */
    it('should return error response when an exception is thrown during balance retrieval', async () => {
      // arrange
      BalanceHandlerMock.mockGetLockAddressAssets().mockImplementation(() => {
        throw new Error('custom_error');
      });
      BalanceHandlerMock.mockGetColdAddressAssets().mockResolvedValue([]);

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
