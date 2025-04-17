import fastify from 'fastify';
import { FastifySeverInstance } from '../../src/api/schemas';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { OrderStatus } from '../../src/utils/constants';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import {
  arrangedOrderJson,
  disarrangedOrderJson,
  orderJson,
} from '../arbitrary/testData';
import { arbitraryOrderRoute } from '../../src/api/arbitrary';
import { invalidOrderJson } from './testData';

describe('arbitrary', () => {
  describe('POST /order', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(async () => {
      mockedServer = fastify();
      mockedServer.register(arbitraryOrderRoute);
      await DatabaseActionMock.clearTables();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[POST /order] should insert new order successfully
     * @dependencies
     * - database
     * @scenario
     * - send a request to the server
     * - check the result
     * - check database
     * @expected
     * - it should return status code 200
     * - order should be inserted into db
     */
    it('should insert new order successfully', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: ERGO_CHAIN,
          orderJson: orderJson,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(200);

      // check database
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.chain, order.orderJson, order.status]
      );
      expect(dbOrders.length).toEqual(1);
      expect(dbOrders).to.deep.contain([
        '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
        ERGO_CHAIN,
        orderJson,
        OrderStatus.pending,
      ]);
    });

    /**
     * @target fastifyServer[POST /order] should insert encoded version of the order
     * @dependencies
     * - database
     * @scenario
     * - send a request to the server
     * - check the result
     * - check database
     * @expected
     * - it should return status code 200
     * - the encoded version of order should be inserted into db
     */
    it('should insert encoded version of the order', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: ERGO_CHAIN,
          orderJson: disarrangedOrderJson,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(200);

      // check database
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.chain, order.orderJson, order.status]
      );
      expect(dbOrders.length).toEqual(1);
      expect(dbOrders).to.deep.contain([
        '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
        ERGO_CHAIN,
        arrangedOrderJson,
        OrderStatus.pending,
      ]);
    });

    /**
     * @target fastifyServer[POST /order] should return 400 when order json is invalid
     * @dependencies
     * - database
     * @scenario
     * - send a request to the server
     * - check the result
     * - check database
     * @expected
     * - it should return status code 400
     * - no order should be inserted into db
     */
    it('should return 400 when order json is invalid', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: ERGO_CHAIN,
          orderJson: invalidOrderJson,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(400);

      // check database
      const dbOrders = await DatabaseActionMock.allOrderRecords();
      expect(dbOrders.length).toEqual(0);
    });

    /**
     * @target fastifyServer[POST /order] should return 409 when order is already in database
     * @dependencies
     * - database
     * @scenario
     * - insert mocked order into db
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 409
     */
    it('should return 409 when order is already in database', async () => {
      // insert mocked order into db
      await DatabaseActionMock.insertOrderRecord(
        '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
        ERGO_CHAIN,
        orderJson,
        OrderStatus.pending
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: ERGO_CHAIN,
          orderJson: orderJson,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(409);
    });

    /**
     * @target fastifyServer[POST /order] should return 400 when chain is not supported
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 400
     */
    it('should return 400 when chain is not supported', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: 'unsupported-chain',
          orderJson: orderJson,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(400);
    });

    /**
     * @target fastifyServer[POST /order] should return 400 when id is invalid
     * @dependencies
     * - ChainHandler
     * - database
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 400
     */
    it('should return 400 when id is invalid', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: 'id',
          chain: ERGO_CHAIN,
          orderJson: orderJson,
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(400);
    });

    /**
     * @target fastifyServer[POST /order] should return 403 when Api-Key did not set in header
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 403
     */
    it('should return 403 when Api-Key did not set in header', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: ERGO_CHAIN,
          orderJson: orderJson,
        },
      });
      // check the result
      expect(result.statusCode).toEqual(403);
    });

    /**
     * @target fastifyServer[POST /order] should return 403 when Api-Key is wrong
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 403
     */
    it('should return 403 when Api-Key is wrong', async () => {
      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/order',
        body: {
          id: '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          chain: ERGO_CHAIN,
          orderJson: orderJson,
        },
        headers: {
          'Api-Key': 'wrong',
        },
      });
      // check the result
      expect(result.statusCode).toEqual(403);
    });
  });
});
