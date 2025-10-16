import fastify from 'fastify';
import { FastifySeverInstance } from '../../src/api/schemas';
import { eventReprocessRoute } from '../../src/api/reprocess';
import EventReprocessMock from '../reprocess/mocked/eventReprocess.mock';
import { NotFoundError } from '@rosen-chains/abstract-chain';

describe('reprocess', () => {
  describe('POST /reprocess', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(async () => {
      mockedServer = fastify();
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
  });
});
