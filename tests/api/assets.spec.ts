import fastify from 'fastify';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { FastifySeverInstance } from '../../src/types/api';
import { assetRoutes } from '../../src/api/assets';

describe('assets', () => {
  let mockedServer: FastifySeverInstance;

  beforeEach(() => {
    mockedServer = fastify();
    mockedServer.register(assetRoutes);
  });

  const mockCardanoLockAddressAssets = (
    nativeToken: bigint,
    tokens: Array<{ id: string; value: bigint }>
  ) => {
    const lockBalance: AssetBalance = {
      nativeToken: nativeToken,
      tokens: tokens,
    };
    ChainHandlerMock.mockFromChainFunction('getLockAddressAssets', lockBalance);
  };

  describe('GET /assets', () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target fastifyServer[GET /assets] should return ergo guard assets correctly
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return ergo guard assets correctly
     */
    it('should return ergo guard assets correctly', async () => {
      const lockBalance: AssetBalance = {
        nativeToken: 10n,
        tokens: [{ id: 'id', value: 20n }],
      };
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getLockAddressAssets',
        lockBalance
      );

      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'chain=ergo',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId: ERG,
            tokenName: ERG,
            amount: '10',
            chain: ERGO_CHAIN,
          },
          {
            tokenId: 'id',
            tokenName: 'id',
            amount: '20',
            chain: ERGO_CHAIN,
          },
        ],
        total: 2,
      });
    });

    /**
     * @target fastifyServer[GET /assets] should return cardano guard assets with filter correctly
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return cardano guard assets correctly
     * - should filter ada tokenId
     */
    it('should return cardano guard assets with filter correctly', async () => {
      ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'chain=cardano&tokenId=ada',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId: ADA,
            tokenName: ADA,
            amount: '10',
            chain: CARDANO_CHAIN,
          },
        ],
        total: 1,
      });
    });

    /**
     * @target fastifyServer[GET /assets] should return cardano guard assets with limit offset correctly
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return cardano guard assets correctly
     * - should limit the outputs
     */
    it('should return cardano guard assets with limit offset correctly', async () => {
      ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
      mockCardanoLockAddressAssets(10n, [
        { id: 'id1', value: 20n },
        { id: 'id2', value: 30n },
      ]);
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'chain=cardano&limit=1&offset=1',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId: 'id1',
            tokenName: 'id1',
            amount: '20',
            chain: CARDANO_CHAIN,
          },
        ],
        total: 3,
      });
    });
  });
});
