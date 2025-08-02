import { HealthStatusLevel } from '@rosen-bridge/health-check';
import { guardInfo } from './testData';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { generalInfoRoute } from '../../src/api/generalInfo';
import fastify from 'fastify';
import { FastifySeverInstance } from '../../src/api/schemas';

describe('generalInfo', () => {
  describe('GET /info', () => {
    let mockedServer: FastifySeverInstance;

    beforeEach(() => {
      mockedServer = fastify();
      mockedServer.register(generalInfoRoute);
      ChainHandlerMock.resetMock();
    });

    afterEach(() => {
      mockedServer.close();
    });

    /**
     * @target fastifyServer[GET /info] should return general info of the guard correctly
     * @dependencies
     * - HealthCheck
     * @scenario
     * - mock healthCheck
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 200
     * - it should return general info of the guard correctly
     */
    it('should return general info of the guard correctly', async () => {
      // mock healthCheck
      vi.mock('../../src/guard/HealthCheck', () => {
        return {
          getHealthCheck: vi.fn().mockResolvedValue({
            getOverallHealthStatus: vi
              .fn()
              .mockResolvedValue(HealthStatusLevel.HEALTHY),
            getTrialErrors: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      // send a request to the server
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/info',
      });

      // check the result
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual(guardInfo);
    });
  });
});
