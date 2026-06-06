import rateLimit from '@fastify/rate-limit';

import { FastifyWithZod, makeFastify } from '@rosen-bridge/fastify-enhanced';

import { authRoutes } from '../../src/api/auth';
import Configs from '../../src/configs/configs';

describe('auth', () => {
  describe('GET /auth', () => {
    let mockedServer: FastifyWithZod;

    beforeEach(async () => {
      mockedServer = await makeFastify();
      await mockedServer.register(rateLimit, {
        max: Configs.apiMaxRequestsPerMinute,
        timeWindow: '1 minute',
      });
      mockedServer.register(authRoutes);
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /auth] should respond with success message when api key is correct
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 200
     */
    it('should respond with success message when api key is correct', async () => {
      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/auth',
        headers: {
          'Api-Key': 'hello',
        },
      });

      // assert
      expect(result.statusCode).toEqual(200);
      expect(result.json().message).toEqual('ok');
    });

    /**
     * @target fastifyServer[GET /auth] should respond with error when api key is incorrect
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 403
     */
    it('should respond with error when api key is incorrect', async () => {
      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/auth',
        headers: {
          'Api-Key': 'hello-wrong',
        },
      });

      // assert
      expect(result.statusCode).toEqual(403);
      expect(result.json().message).toEqual(
        "Api-Key doesn't exist or it's wrong",
      );
    });

    /**
     * @target fastifyServer[GET /auth] should respond with error when api key is missing
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 403
     */
    it('should respond with error when api key is missing', async () => {
      // act
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/auth',
      });

      // assert
      expect(result.statusCode).toEqual(403);
      expect(result.json().message).toEqual(
        "Api-Key doesn't exist or it's wrong",
      );
    });

    /**
     * @target fastifyServer[GET /auth] should respond with error when rate limit is triggered
     * @dependencies
     * @scenario
     * - send multiple requests to the server until rate limit is triggered
     * - check the response after each request
     * @expected
     * - it should respond with 429 when rate limit is triggered
     */
    it('should respond with error when rate limit is triggered', async () => {
      // act and assert
      for (let i = 1; i <= Configs.apiTokeValidationRateLimit; i += 1) {
        const result = await mockedServer.inject({
          method: 'GET',
          url: '/auth',
          headers: {
            'Api-Key': 'hello',
          },
        });

        expect(result.statusCode).not.toEqual(429);
        expect(result.headers['x-ratelimit-remaining']).toEqual(
          `${Configs.apiTokeValidationRateLimit - i}`,
        );
        expect(result.headers['x-ratelimit-limit']).toEqual(
          `${Configs.apiTokeValidationRateLimit}`,
        );
      }

      const result = await mockedServer.inject({
        method: 'GET',
        url: '/auth',
        headers: {
          'Api-Key': 'hello',
        },
      });

      expect(result.statusCode).toEqual(429);
      expect(result.headers['x-ratelimit-remaining']).toEqual('0');
    });
  });
});
