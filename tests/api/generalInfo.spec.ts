import { AssetBalance } from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { guardInfo } from './testData';
import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { generalInfoRoute } from '../../src/api/generalInfo';
import fastify from 'fastify';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../../src/configs/GuardsCardanoConfigs';
import { FastifySeverInstance } from '../../src/api/schemas';

vi.mock('../../src/utils/constants', async (importOriginal) => {
  const mod = await importOriginal<
    typeof import('../../src/utils/constants')
  >();
  return {
    ...mod,
    SUPPORTED_CHAINS: [ERGO_CHAIN, CARDANO_CHAIN],
  };
});

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
     * - ChainHandler
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
      const ergoLockBalance: AssetBalance = {
        nativeToken: 10n,
        tokens: [{ id: '1', value: 20n }],
      };
      const ergoColdBalance: AssetBalance = {
        nativeToken: 100n,
        tokens: [],
      };
      const cardanoLockBalance: AssetBalance = {
        nativeToken: 20n,
        tokens: [{ id: '2', value: 40n }],
      };
      const cardanoColdBalance: AssetBalance = {
        nativeToken: 200n,
        tokens: [],
      };
      const chain = CARDANO_CHAIN;
      ChainHandlerMock.mockChainName(chain);
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getLockAddressAssets',
        ergoLockBalance
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getColdAddressAssets',
        ergoColdBalance
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getChainConfigs',
        GuardsErgoConfigs.chainConfigs
      );
      ChainHandlerMock.mockChainFunction(
        chain,
        'getLockAddressAssets',
        cardanoLockBalance
      );
      ChainHandlerMock.mockChainFunction(
        chain,
        'getColdAddressAssets',
        cardanoColdBalance
      );
      ChainHandlerMock.mockChainFunction(
        chain,
        'getChainConfigs',
        GuardsCardanoConfigs.chainConfigs
      );

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
