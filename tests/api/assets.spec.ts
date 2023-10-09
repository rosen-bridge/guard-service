import fastify from 'fastify';
import { AssetBalance } from '@rosen-chains/abstract-chain';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import ChainHandlerMock from '../handlers/ChainHandler.mock';
import { assetRoutes } from '../../src/api/assets';
import ChainHandler from '../../src/handlers/ChainHandler';
import { FastifySeverInstance } from '../../src/api/types';

describe('assets', () => {
  let mockedServer: FastifySeverInstance;

  beforeEach(() => {
    mockedServer = fastify();
    mockedServer.register(assetRoutes);
  });

  afterEach(() => {
    mockedServer.close();
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

  const mockErgoLockAddressAssets = () => {
    const lockBalance: AssetBalance = {
      nativeToken: 10n,
      tokens: [{ id: 'id', value: 20n }],
    };
    ChainHandlerMock.mockErgoFunctionReturnValue(
      'getLockAddressAssets',
      lockBalance
    );
  };

  describe('GET /assets', () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target fastifyServer[GET /assets] should return ergo guard assets correctly with ergo chain filter
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for ergo
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return ergo guard assets correctly
     */
    it('should return ergo guard assets correctly with ergo chain filter', async () => {
      mockErgoLockAddressAssets();
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
            name: ERG,
            decimals: 9,
            amount: '10',
            chain: ERGO_CHAIN,
          },
          {
            tokenId: 'id',
            name: 'Unsupported token',
            decimals: 0,
            amount: '20',
            chain: ERGO_CHAIN,
          },
        ],
        total: 2,
      });
      expect(ChainHandler.getInstance().getChain).not.toBeCalledWith(
        CARDANO_CHAIN
      );
      expect(ChainHandler.getInstance().getChain).toBeCalledWith(ERGO_CHAIN);
    });

    /**
     * @target fastifyServer[GET /assets] should return cardano guard assets with cardano chain filter correctly
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for cardano
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return cardano guard assets correctly
     * - should filter ada tokenId
     */
    it('should return cardano guard assets with cardano chain filter correctly', async () => {
      ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'chain=cardano',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId: ADA,
            name: ADA,
            decimals: 6,
            amount: '10',
            chain: CARDANO_CHAIN,
          },
          {
            tokenId: 'id',
            name: 'Unsupported token',
            decimals: 0,
            amount: '20',
            chain: CARDANO_CHAIN,
          },
        ],
        total: 2,
      });
      expect(ChainHandler.getInstance().getChain).toBeCalledWith(CARDANO_CHAIN);
      expect(ChainHandler.getInstance().getChain).not.toBeCalledWith(
        ERGO_CHAIN
      );
    });

    /**
     * @target fastifyServer[GET /assets] should return guard assets with token id filter correctly
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for ergo and cardano
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should filter ada tokenId
     */
    it('should return guard assets with token id filter correctly', async () => {
      ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockErgoLockAddressAssets();

      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'tokenId=ada',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId: ADA,
            name: ADA,
            decimals: 6,
            amount: '10',
            chain: CARDANO_CHAIN,
          },
        ],
        total: 1,
      });
    });

    /**
     * @target fastifyServer[GET /assets] should return guard assets with token name filter correctly
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for ergo and cardano
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should filter ada token name
     */
    it('should return guard assets with token name filter correctly', async () => {
      ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockErgoLockAddressAssets();

      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'name=ada',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId: ADA,
            name: ADA,
            decimals: 6,
            amount: '10',
            chain: CARDANO_CHAIN,
          },
        ],
        total: 1,
      });
    });

    /**
     * @target fastifyServer[GET /assets] should return cardano guard assets with limit and offset correctly
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
    it('should return cardano guard assets with limit and offset correctly', async () => {
      ChainHandlerMock.mockChainName(CARDANO_CHAIN, true);
      mockCardanoLockAddressAssets(10n, [
        { id: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx', value: 20n },
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
            tokenId: 'asset1epz7gzjqg5py4xrgps6ccv25gz7gd6v8e5gmxx',
            name: 'wrapped-erg',
            decimals: 9,
            amount: '20',
            chain: CARDANO_CHAIN,
          },
        ],
        total: 3,
      });
    });
  });
});
