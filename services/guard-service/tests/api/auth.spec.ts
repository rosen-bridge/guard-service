import rateLimit from '@fastify/rate-limit';

import { FastifyWithZod, makeFastify } from '@rosen-bridge/fastify-enhanced';

import { authRoutes } from '../../src/api/auth';
import Configs from '../../src/configs/configs';

describe('auth', () => {
  describe('POST /auth', () => {
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
     * @target fastifyServer[POST /auth] should respond with success message when api key is correct
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
        method: 'POST',
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
     * @target fastifyServer[POST /auth] should respond with error when api key is incorrect
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
        method: 'POST',
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
     * @target fastifyServer[POST /auth] should respond with error when api key is missing
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
        method: 'POST',
        url: '/auth',
      });

      // assert
      expect(result.statusCode).toEqual(403);
      expect(result.json().message).toEqual(
        "Api-Key doesn't exist or it's wrong",
      );
    });

    /**
     * @target fastifyServer[POST /auth] should respond with error when rate limit is triggered
     * @dependencies
     * @scenario
     * - in the test config set rate limit of this route to 2
     * - send 3 requests to the server
     * - check the responses
     * @expected
     * - all 3 responses should contain x-ratelimit-limit header with the value of 2
     * - for the first request
     *   - response status should not be 429
     *   - response header x-ratelimit-remaining should be 1
     * - for the second request
     *   - response status should not be 429
     *   - response header x-ratelimit-remaining should be 0
     * - for the third request
     *   - response status should be 429
     *   - response header x-ratelimit-remaining should be 0
     */
    it('should respond with error when rate limit is triggered', async () => {
      // act
      const responses = [];
      for (
        let i = 1;
        i <= Configs.apiMaxRequestsPerMinutePostRoutes + 1;
        i += 1
      ) {
        const response = await mockedServer.inject({
          method: 'POST',
          url: '/auth',
          headers: {
            'Api-Key': 'hello',
          },
        });

        responses.push(response);
      }

      // assert
      expect(responses[0].statusCode).not.toEqual(429);
      expect(responses[0].headers['x-ratelimit-remaining']).toEqual('1');
      expect(responses[0].headers['x-ratelimit-limit']).toEqual('2');

      expect(responses[1].statusCode).not.toEqual(429);
      expect(responses[1].headers['x-ratelimit-remaining']).toEqual('0');
      expect(responses[1].headers['x-ratelimit-limit']).toEqual('2');

      expect(responses[2].statusCode).toEqual(429);
      expect(responses[2].headers['x-ratelimit-remaining']).toEqual('0');
      expect(responses[2].headers['x-ratelimit-limit']).toEqual('2');
    });
  });
});
