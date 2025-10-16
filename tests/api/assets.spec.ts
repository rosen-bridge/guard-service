import fastify from 'fastify';
import { AssetBalance, TokenInfo } from '@rosen-chains/abstract-chain';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';

import ChainHandlerMock from '../handlers/chainHandler.mock';
import { assetRoutes } from '../../src/api/assets';
import ChainHandler from '../../src/handlers/chainHandler';
import { FastifySeverInstance } from '../../src/api/schemas';

vi.mock('../../src/utils/constants', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('../../src/utils/constants')>();
  return {
    ...mod,
    SUPPORTED_CHAINS: [ERGO_CHAIN, CARDANO_CHAIN, BITCOIN_CHAIN],
  };
});

describe('assets', () => {
  let mockedServer: FastifySeverInstance;

  beforeEach(() => {
    mockedServer = fastify();
    mockedServer.register(assetRoutes);
  });

  afterEach(() => {
    mockedServer.close();
  });

  const mockBitcoinLockAddressAssets = (
    nativeToken: bigint,
    tokens: Array<TokenInfo>,
  ) => {
    const lockBalance: AssetBalance = {
      nativeToken: nativeToken,
      tokens: tokens,
    };
    ChainHandlerMock.mockChainFunction(
      BITCOIN_CHAIN,
      'getLockAddressAssets',
      lockBalance,
    );
  };

  const mockBitcoinColdAddressAssets = (
    nativeToken: bigint,
    tokens: Array<TokenInfo>,
  ) => {
    const balance: AssetBalance = {
      nativeToken: nativeToken,
      tokens: tokens,
    };
    ChainHandlerMock.mockChainFunction(
      BITCOIN_CHAIN,
      'getColdAddressAssets',
      balance,
    );
  };

  const mockCardanoLockAddressAssets = (
    nativeToken: bigint,
    tokens: Array<TokenInfo>,
  ) => {
    const lockBalance: AssetBalance = {
      nativeToken: nativeToken,
      tokens: tokens,
    };
    ChainHandlerMock.mockChainFunction(
      CARDANO_CHAIN,
      'getLockAddressAssets',
      lockBalance,
    );
  };

  const mockCardanoColdAddressAssets = (
    nativeToken: bigint,
    tokens: Array<TokenInfo>,
  ) => {
    const balance: AssetBalance = {
      nativeToken: nativeToken,
      tokens: tokens,
    };
    ChainHandlerMock.mockChainFunction(
      CARDANO_CHAIN,
      'getColdAddressAssets',
      balance,
    );
  };

  const mockErgoLockAddressAssets = (addMultiDecimalToken = false) => {
    const lockBalance: AssetBalance = {
      nativeToken: 10n,
      tokens: [{ id: 'id', value: 20n }],
    };
    if (addMultiDecimalToken)
      lockBalance.tokens.push({
        id: '79b6e982d95211bbc2a8ffc6d087694511f0b85ca6d4894e58b766c8fa69dfd4',
        value: 2000n,
      });
    ChainHandlerMock.mockErgoFunctionReturnValue(
      'getLockAddressAssets',
      lockBalance,
    );
  };

  const mockErgoColdAddressAssets = () => {
    const balance: AssetBalance = {
      nativeToken: 100n,
      tokens: [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
      ],
    };
    ChainHandlerMock.mockErgoFunctionReturnValue(
      'getColdAddressAssets',
      balance,
    );
  };

  describe('GET /assets', () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
    });

    /**
     * @target fastifyServer[GET /assets] should return ergo guard assets with significant decimals
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for ergo with multi decimal token
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return ergo guard assets correctly
     */
    it('should return ergo guard assets with significant decimals', async () => {
      mockErgoLockAddressAssets(true);
      mockErgoColdAddressAssets();
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
            amount: 10,
            chain: ERGO_CHAIN,
            coldAmount: 100,
            isNativeToken: true,
          },
          {
            tokenId: 'id',
            name: 'Unsupported token',
            decimals: 0,
            amount: 20,
            chain: ERGO_CHAIN,
            coldAmount: 30,
            isNativeToken: false,
          },
          {
            tokenId:
              '79b6e982d95211bbc2a8ffc6d087694511f0b85ca6d4894e58b766c8fa69dfd4',
            name: 'MDToken-loen',
            decimals: 1,
            amount: 2000,
            chain: ERGO_CHAIN,
            coldAmount: 0,
            isNativeToken: false,
          },
        ],
        total: 3,
      });
      expect(ChainHandler.getInstance().getChain).not.toBeCalledWith(
        CARDANO_CHAIN,
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
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockCardanoColdAddressAssets(20n, [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
      ]);
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
            amount: 10,
            chain: CARDANO_CHAIN,
            coldAmount: 20,
            isNativeToken: true,
          },
          {
            tokenId: 'id',
            name: 'Unsupported token',
            decimals: 0,
            amount: 20,
            chain: CARDANO_CHAIN,
            coldAmount: 30,
            isNativeToken: false,
          },
        ],
        total: 2,
      });
      expect(ChainHandler.getInstance().getChain).toBeCalledWith(CARDANO_CHAIN);
      expect(ChainHandler.getInstance().getChain).not.toBeCalledWith(
        ERGO_CHAIN,
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
      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      mockBitcoinLockAddressAssets(30n, []);
      mockBitcoinColdAddressAssets(300n, []);
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockCardanoColdAddressAssets(20n, [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
      ]);
      mockErgoLockAddressAssets();
      mockErgoColdAddressAssets();

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
            amount: 10,
            chain: CARDANO_CHAIN,
            coldAmount: 20,
            isNativeToken: true,
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
      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      mockBitcoinLockAddressAssets(30n, []);
      mockBitcoinColdAddressAssets(300n, []);
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockCardanoColdAddressAssets(20n, [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
      ]);
      mockErgoLockAddressAssets();
      mockErgoColdAddressAssets();

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
            amount: 10,
            chain: CARDANO_CHAIN,
            coldAmount: 20,
            isNativeToken: true,
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
      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      mockBitcoinLockAddressAssets(30n, []);
      mockBitcoinColdAddressAssets(300n, []);
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      mockCardanoLockAddressAssets(10n, [
        {
          id: 'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
          value: 20n,
        },
        { id: 'id2', value: 30n },
      ]);
      mockCardanoColdAddressAssets(20n, [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
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
            tokenId:
              'd2f6eb37450a3d568de93d623e69bd0ba1238daacc883d75736abd23.527374457267565465737432',
            name: 'wrapped-erg',
            decimals: 9,
            amount: 20,
            chain: CARDANO_CHAIN,
            coldAmount: 0,
            isNativeToken: false,
          },
        ],
        total: 3,
      });
    });

    /**
     * @target fastifyServer[GET /assets] should return requested asset with
     * zero amount when request has token id filter
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for ergo and cardano
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 200
     * - should return requested token with zero amount
     */
    it('should return requested asset with zero amount when request has token id filter', async () => {
      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      mockBitcoinLockAddressAssets(30n, []);
      mockBitcoinColdAddressAssets(300n, []);
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockCardanoColdAddressAssets(20n, [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
      ]);
      mockErgoLockAddressAssets();
      mockErgoColdAddressAssets();
      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query:
          'tokenId=38cb230f68a28436fb3b73ae4b927626673e4620bc7c94896178567d436e416b',
      });

      expect(result.statusCode).toEqual(200);
      expect(result.json()).toEqual({
        items: [
          {
            tokenId:
              '38cb230f68a28436fb3b73ae4b927626673e4620bc7c94896178567d436e416b',
            name: 'RstAdaVTest2',
            decimals: 6,
            amount: 0,
            chain: ERGO_CHAIN,
            coldAmount: 0,
            isNativeToken: false,
          },
        ],
        total: 1,
      });
    });

    /**
     * @target fastifyServer[GET /assets] should return status code 400
     * when token is not found in any chains
     * @dependencies
     * @scenario
     * - mock getLockAddressAssets function of ChainHandler for ergo and cardano
     * - send a request to the mockedServer
     * - check the result
     * @expected
     * - should return status code 400
     */
    it('should return status code 400 when token is not found in any chains', async () => {
      ChainHandlerMock.mockChainName(BITCOIN_CHAIN);
      mockBitcoinLockAddressAssets(30n, []);
      mockBitcoinColdAddressAssets(300n, []);
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      mockCardanoLockAddressAssets(10n, [{ id: 'id', value: 20n }]);
      mockCardanoColdAddressAssets(20n, [
        { id: 'id', value: 30n },
        { id: 'id2', value: 40n },
      ]);
      mockErgoLockAddressAssets();
      mockErgoColdAddressAssets();

      const result = await mockedServer.inject({
        method: 'GET',
        url: '/assets',
        query: 'tokenId=notfoundtoken',
      });

      expect(result.statusCode).toEqual(400);
    });
  });
});
