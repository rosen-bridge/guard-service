import { FastifyWithZod, makeFastify } from '@rosen-bridge/fastify-enhanced';

import { addressRoutes } from '../../src/api/address';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockAddresses, mockPartialAddresses } from './testData';

describe('address', () => {
  describe('GET /address', () => {
    let mockedServer: FastifyWithZod;

    beforeEach(async () => {
      mockedServer = await makeFastify();
      mockedServer.register(addressRoutes);
      await DatabaseActionMock.clearTables();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /address] should get address records successfully
     * @dependencies
     * - database
     * @scenario
     * - populate database with mock address records
     * - send a request to the server without any queries specified
     * - check the response
     * @expected
     * - it should return status code 200
     * - response should contain all the address records
     */
    it('should get address records successfully', async () => {
      // arrange
      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/address',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        total: 8,
        items: mockPartialAddresses,
      });
    });

    /**
     * @target fastifyServer[GET /address] should get hot address records successfully
     * @dependencies
     * - database
     * @scenario
     * - populate database with mock address records
     * - send a request to the server with type query set to "hot"
     * - check the response
     * @expected
     * - it should return status code 200
     * - response should contain all the hot address records
     */
    it('should get hot address records successfully', async () => {
      // arrange
      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/address',
        query: {
          type: 'hot',
        },
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        total: 5,
        items: mockPartialAddresses.filter((address) => address.type === 'hot'),
      });
    });

    /**
     * @target fastifyServer[GET /address] should get cold address records successfully
     * @dependencies
     * - database
     * @scenario
     * - populate database with mock address records
     * - send a request to the server with type query set to "cold"
     * - check the response
     * @expected
     * - it should return status code 200
     * - response should contain all the cold address records
     */
    it('should get cold address records successfully', async () => {
      // arrange
      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/address',
        query: {
          type: 'cold',
        },
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        total: 3,
        items: mockPartialAddresses.filter(
          (address) => address.type === 'cold',
        ),
      });
    });

    /**
     * @target fastifyServer[GET /address] should get cardano address records successfully
     * @dependencies
     * - database
     * @scenario
     * - populate database with mock address records
     * - send a request to the server with chain query set to "cardano"
     * - check the response
     * @expected
     * - it should return status code 200
     * - response should contain all the cardano address records
     */
    it('should get cardano address records successfully', async () => {
      // arrange
      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/address',
        query: {
          chain: 'cardano',
        },
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        total: 2,
        items: mockPartialAddresses.filter(
          (address) => address.chain === 'cardano',
        ),
      });
    });

    /**
     * @target fastifyServer[GET /address] should get cardano hot address record successfully
     * @dependencies
     * - database
     * @scenario
     * - populate database with mock address records
     * - send a request to the server with chain query set to "cardano" and type set to "hot"
     * - check the response
     * @expected
     * - it should return status code 200
     * - response should contain the cardano hot address record
     */
    it('should get cardano hot address record successfully', async () => {
      // arrange
      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/address',
        query: {
          chain: 'cardano',
          type: 'hot',
        },
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        total: 1,
        items: mockPartialAddresses.filter(
          (address) => address.chain === 'cardano' && address.type === 'hot',
        ),
      });
    });
  });
});
