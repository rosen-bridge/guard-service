import { FastifyWithZod, makeFastify } from '@rosen-bridge/fastify-enhanced';
import { ERGO_CHAIN } from '@rosen-bridge/tokens';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { DOGE } from '@rosen-chains/doge';

import { balanceRoutes } from '../../src/api/balance';
import BalanceHandler from '../../src/handlers/balanceHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { fillTokenEntity } from '../../src/utils/fillTokenEntity';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { getTokenName } from '../db/testData';
import { mockAddresses, mockBalances, mockBalancesResponse } from './testData';

describe('balanceRoutes', () => {
  describe('GET /balance', () => {
    let mockedServer: FastifyWithZod;

    beforeEach(async () => {
      mockedServer = await makeFastify();
      mockedServer.register(balanceRoutes);

      await DatabaseActionMock.clearTables();

      BalanceHandler.init();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /balance] should respond with all balances when no queries are specified
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler
     * - check the returned response
     * @expected
     * - response status should have been 200
     * - response items should have contained all the mock balances
     */
    it('should respond with all balance records when no queries are specified', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual(mockBalancesResponse);
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances of specified chain when chain query is used
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler with chain="cardano"
     * - call handler with chain="ergo"
     * - call handler with chain="doge"
     * - call handler with chain="aaa"
     * - check the returned responses
     * @expected
     * - status of first 3 responses should have been 200
     * - first response items should have matched the cardano balances
     * - second response items should have matched the ergo balances
     * - third response items should have matched an empty items array
     * - status of the last response should have been 400 indicating an invalid chain name
     */
    it('should respond with balances of specified chain when chain query is used', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const firstResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          chain: 'cardano',
        },
      });
      const secondResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          chain: 'ergo',
        },
      });
      const thirdResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          chain: 'doge',
        },
      });
      const fourthResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          chain: 'aaa',
        },
      });

      // assert
      expect(firstResult.statusCode).toEqual(200);
      expect(firstResult.json()).toEqual({
        total: 7,
        items: mockBalancesResponse.items.filter(
          (record) => record.chain === 'cardano',
        ),
      });

      expect(secondResult.statusCode).toEqual(200);
      expect(secondResult.json()).toEqual({
        total: 1,
        items: mockBalancesResponse.items.filter(
          (record) => record.chain === 'ergo',
        ),
      });

      expect(thirdResult.statusCode).toEqual(200);
      expect(thirdResult.json()).toEqual({
        total: 0,
        items: [],
      });

      expect(fourthResult.statusCode).toEqual(400);
      expect(fourthResult.json()).toEqual({
        message: `Error: Invalid value for the 'chain' field`,
      });
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances of the specified tokenId when tokenId query is used
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler with tokenId="ada"
     * - call handler with tokenId="ba"
     * - call handler with tokenId="doge"
     * - check the returned responses
     * @expected
     * - response statuses should have been 200
     * - first response items should have contained the "ada" balance with total of 1
     * - second response items should have contained balances containing "ba" in their tokenId with total of 2
     * - third response items should have contained empty response with total of 0
     */
    it('should respond with balances of the specified tokenId when tokenId query is used', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const firstResult = await mockedServer.inject({
        method: 'GET',
        url: `/balance?tokenId*=${ADA}`,
      });
      const secondResult = await mockedServer.inject({
        method: 'GET',
        url: `/balance?tokenId*=ba`,
      });
      const thirdResult = await mockedServer.inject({
        method: 'GET',
        url: `/balance?tokenId*=${DOGE}`,
      });

      // assert
      expect(firstResult.statusCode).toEqual(200);
      expect(firstResult.json()).toEqual({
        total: 1,
        items: mockBalancesResponse.items.filter(
          (record) => record.token.id === ADA,
        ),
      });

      expect(secondResult.statusCode).toEqual(200);
      expect(secondResult.json()).toEqual({
        total: 2,
        items: mockBalancesResponse.items.filter((record) =>
          record.token.id.includes('ba'),
        ),
      });

      expect(thirdResult.statusCode).toEqual(200);
      expect(thirdResult.json()).toEqual({
        total: 0,
        items: [],
      });
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances of the specified chain and tokenId when both queries are used
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler with tokenId="ada" and chain="cardano"
     * - call handler with tokenId="ba" and chain="ergo"
     * - call handler with tokenId="er" and chain="ergo"
     * - check the returned responses
     * @expected
     * - response statuses should have been 200
     * - first response items should have contained balances with "cardano" as chain and containing "ada" in its tokenId with total of 1
     * - second response items should have been an empty array with total of 0
     * - third response items should have contained balances with "ergo" as chain and containing "er" in its tokenId with total of 1
     */
    it('should respond with balances of the specified chain and tokenId when both queries are used', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const adaResult = await mockedServer.inject({
        method: 'GET',
        url: `/balance?tokenId*=${ADA}&chain=${CARDANO_CHAIN}`,
      });
      const baResult = await mockedServer.inject({
        method: 'GET',
        url: `/balance?tokenId*=ba&chain=${ERGO_CHAIN}`,
      });
      const erResult = await mockedServer.inject({
        method: 'GET',
        url: `/balance?tokenId*=er&chain=${ERGO_CHAIN}`,
      });

      // assert
      expect(adaResult.statusCode).toEqual(200);
      expect(adaResult.json()).toEqual({
        total: 1,
        items: mockBalancesResponse.items.filter(
          (record) => record.token.id === ADA && record.chain === CARDANO_CHAIN,
        ),
      });

      expect(baResult.statusCode).toEqual(200);
      expect(baResult.json()).toEqual({
        total: 0,
        items: [],
      });

      expect(erResult.statusCode).toEqual(200);
      expect(erResult.json()).toEqual({
        total: 1,
        items: mockBalancesResponse.items.filter(
          (record) =>
            record.token.id.includes('er') && record.chain === ERGO_CHAIN,
        ),
      });
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances respecting the pagination query
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with 9 mock balance records
     * - call handler with offset=0 and limit=5
     * - call handler with offset=4 and limit=10
     * - call handler with offset=10 and limit=10
     * - check the returned responses
     * @expected
     * - response statuses should have been 200
     * - first response items should have contained 5 balances with total of 9
     * - second response items should have contained 4 balances with total of 9
     * - third response items should have contained 0 balances with total of 9
     */
    it('should respond with balances respecting the pagination query', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const firstResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          offset: '0',
          limit: '5',
        },
      });
      const secondResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          offset: '4',
          limit: '10',
        },
      });
      const thirdResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
        query: {
          offset: '10',
          limit: '10',
        },
      });

      // assert
      expect(firstResult.statusCode).toEqual(200);
      expect(firstResult.json()).toEqual({
        total: 9,
        items: mockBalancesResponse.items.slice(0, 5),
      });

      expect(secondResult.statusCode).toEqual(200);
      expect(secondResult.json()).toEqual({
        total: 9,
        items: mockBalancesResponse.items.slice(4),
      });

      expect(thirdResult.statusCode).toEqual(200);
      expect(thirdResult.json()).toEqual({
        total: 9,
        items: [],
      });
    });

    /**
     * @target fastifyServer[GET /balance] should return empty response object when no balances are available
     * @dependencies
     * @scenario
     * - call handler
     * @expected
     * - response status should have been 200
     * - response items should have been an empty array with total of 0
     */
    it('should return empty response object when no balances are available', async () => {
      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [],
        total: 0,
      });
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances sorted by tokenName
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler with sort option tokenName=DESC
     * - call handler with sort option tokenName=ASC
     * - check the returned responses
     * @expected
     * - response statuses should have been 200
     * - first response items should have contained the mock balance records sorted by DESC tokenName
     * - second response items should have contained the mock balance records sorted by ASC tokenName
     */
    it('should respond with balances sorted by tokenName', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const descResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance?sorts=tokenName-DESC',
      });
      const ascResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance?sorts=tokenName-ASC',
      });

      // assert
      expect(descResult.statusCode).toEqual(200);
      expect(descResult.json()).toEqual({
        total: mockBalancesResponse.total,
        items: mockBalancesResponse.items.toSorted((a, b) =>
          getTokenName(b.token.id).localeCompare(
            getTokenName(a.token.id),
            undefined,
            {
              caseFirst: 'lower',
            },
          ),
        ),
      });

      expect(ascResult.statusCode).toEqual(200);
      expect(ascResult.json()).toEqual({
        total: mockBalancesResponse.total,
        items: mockBalancesResponse.items.toSorted((a, b) =>
          getTokenName(a.token.id).localeCompare(
            getTokenName(b.token.id),
            undefined,
            {
              caseFirst: 'lower',
            },
          ),
        ),
      });
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances sorted by chain
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler with sort option chain=DESC
     * - call handler with sort option chain=ASC
     * - check the returned responses
     * @expected
     * - response statuses should have been 200
     * - first response items should have contained the mock balance records sorted by DESC chain
     * - second response items should have contained the mock balance records sorted by ASC chain
     */
    it('should respond with balances sorted by chain', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const descResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance?sorts=chain-DESC',
      });
      const ascResult = await mockedServer.inject({
        method: 'GET',
        url: '/balance?sorts=chain-ASC',
      });

      // assert
      expect(descResult.statusCode).toEqual(200);
      expect(descResult.json()).toEqual({
        total: mockBalancesResponse.total,
        items: mockBalancesResponse.items.toSorted((a, b) =>
          b.chain.localeCompare(a.chain),
        ),
      });

      expect(ascResult.statusCode).toEqual(200);
      expect(ascResult.json()).toEqual({
        total: mockBalancesResponse.total,
        items: mockBalancesResponse.items.toSorted((a, b) =>
          a.chain.localeCompare(b.chain),
        ),
      });
    });

    /**
     * @target fastifyServer[GET /balance] should respond with balances sorted by both chain and tokenName
     * @dependencies
     * - database
     * - TokenHandler
     * @scenario
     * - populate database with mock token records
     * - populate database with mock address records
     * - populate database with mock balance records
     * - call handler with sort option chain=DESC and tokenName=ASC
     * - check the returned response
     * @expected
     * - response status should have been 200
     * - response items should have contained the mock balance records sorted by DESC chain and ASC tokenName
     */
    it('should respond with balances sorted by both chain and tokenName', async () => {
      // arrange
      const tokenMap = TokenHandler.getInstance().getTokenMap().getRawConfig();
      await fillTokenEntity(DatabaseActionMock.testDataSource, tokenMap);

      for (const address of mockAddresses)
        await DatabaseActionMock.insertAddressRecord(address);

      for (const balance of mockBalances)
        await DatabaseActionMock.insertChainAddressBalanceRecord(balance);

      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/balance?sorts=chain-DESC,tokenName-ASC',
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        total: mockBalancesResponse.total,
        items: mockBalancesResponse.items.toSorted((a, b) =>
          a.chain !== b.chain
            ? b.chain.localeCompare(a.chain)
            : getTokenName(a.token.id).localeCompare(
                getTokenName(b.token.id),
                undefined,
                {
                  caseFirst: 'lower',
                },
              ),
        ),
      });
    });

    /**
     * @target fastifyServer[GET /balance] should return error response when an exception is thrown during balance retrieval
     * @dependencies
     * - database
     * @scenario
     * - stub DatabaseAction.getChainAddressBalanceTokenIds to reject with a mock error message
     * - call handler
     * @expected
     * - response status should have been 500
     * - response should have matched the mock error message
     */
    it('should return error response when an exception is thrown during balance retrieval', async () => {
      // arrange
      vi.spyOn(
        DatabaseActionMock.testDatabase,
        'getChainAddressBalanceTokenIds',
      ).mockRejectedValueOnce(new Error('custom_error'));

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
