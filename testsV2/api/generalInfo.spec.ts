import { apiServer, initApiServer } from '../../src/jobs/apiServer';
import { guardInfo } from './testData';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { AddressBalance } from '../../src/chains/ergo/models/Interfaces';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { mockGetChain } from './mocked/getChain';

describe('generalInfo', () => {
  describe('GET /info', () => {
    beforeAll(async () => {
      await initApiServer();
    });

    /**
     * @target fastifyServer[GET /info] should return general info of the guard correctly
     * @dependencies
     * @scenario
     * - mock getChain function of ChainHandler
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 200
     * - it should return general info of the guard correctly
     */
    it('should return general info of the guard correctly', async () => {
      // mock getChain function of ChainHandler
      mockGetChain();

      // send a request to the server
      const result = await apiServer.inject({
        method: 'GET',
        url: '/info',
      });

      // check the result
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual(guardInfo);
    });
  });
});
