import { fastifyServer, initApiServer } from '../../src/jobs/apiServer';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { guardInfo } from './testData';
import { mockErgoNetwork } from './mocked/ErgoNetwork.mock';
import { mockCardanoNetwork } from './mocked/CardanoNetwork.mock';

describe('generalInfo', () => {
  describe('GET /info', () => {
    beforeAll(async () => {
      await initApiServer();
      mockErgoNetwork();
      mockCardanoNetwork();
    });

    /**
     * @target fastifyServer[GET /info] should return general info of the guard correctly
     * @dependencies
     * @scenario
     * - send a request to the server
     * - check the result
     * @expected
     * - it should return status code 200
     * - it should return general info of the guard correctly
     */
    it('should return general info of the guard correctly', async () => {
      // send a request to the server
      const result = await fastifyServer.inject({
        method: 'GET',
        url: '/info',
      });

      // check the result
      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual(guardInfo);
    });
  });
});
