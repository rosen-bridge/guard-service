import rateLimit from '@fastify/rate-limit';

import { FastifyWithZod, makeFastify } from '@rosen-bridge/fastify-enhanced';
import { NotFoundError } from '@rosen-chains/abstract-chain';

import { eventReprocessRoute } from '../../src/api/reprocess';
import Configs from '../../src/configs/configs';
import EventReprocessMock from '../reprocess/mocked/eventReprocess.mock';

describe('reprocess', () => {
  describe('POST /reprocess', () => {
    let mockedServer: FastifyWithZod;

    beforeEach(async () => {
      mockedServer = await makeFastify();
      await mockedServer.register(rateLimit, {
        max: Configs.apiMaxRequestsPerMinute,
        timeWindow: '1 minute',
      });
      mockedServer.register(eventReprocessRoute);
      EventReprocessMock.resetMock();
      EventReprocessMock.mock();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[POST /reprocess] should call sendReprocessRequest successfully
     * @dependencies
     * - EventReprocess
     * @scenario
     * - mock successful sendReprocessRequest
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 200
     */
    it('should call sendReprocessRequest successfully', async () => {
      // mock successful sendReprocessRequest
      EventReprocessMock.mockSendReprocessRequest(false);

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/reprocess',
        body: {
          eventId:
            '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          peerIds: ['peer0', 'peer1'],
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(200);
    });

    /**
     * @target fastifyServer[POST /reprocess] should return 404 when event is not found
     * @dependencies
     * - EventReprocess
     * @scenario
     * - mock sendReprocessRequest to throw NotFoundError
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 404
     */
    it('should return 404 when event is not found', async () => {
      // mock sendReprocessRequest to throw NotFoundError
      EventReprocessMock.mockSendReprocessRequest(
        true,
        new NotFoundError(`A not found Error for test`),
      );

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/reprocess',
        body: {
          eventId:
            '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          peerIds: ['peer0', 'peer1'],
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(404);
    });

    /**
     * @target fastifyServer[POST /reprocess] should return 400 when an error occurred while sending requests
     * @dependencies
     * - EventReprocess
     * @scenario
     * - mock sendReprocessRequest to throw NotFoundError
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 400
     */
    it('should return 400 when an error occurred while sending requests', async () => {
      // mock sendReprocessRequest to throw NotFoundError
      EventReprocessMock.mockSendReprocessRequest(true);

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'POST',
        url: '/reprocess',
        body: {
          eventId:
            '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
          peerIds: ['peer0', 'peer1'],
        },
        headers: {
          'Api-Key': 'hello',
        },
      });

      // check the result
      expect(result.statusCode).toEqual(400);
    });

    /**
     * @target fastifyServer[POST /reprocess] should respond with error when rate limit is triggered
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
          url: '/reprocess',
          body: {
            eventId:
              '85b5cb7f4e81e1db4e95803b6144c64983f76e776ff75fd04c0ebfc95ae46e4d',
            peerIds: ['peer0', 'peer1'],
          },
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
