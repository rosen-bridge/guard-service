import { Type } from '@sinclair/typebox';
import { Asset, FastifySeverInstance } from '../types/api';
import { messageResponseSchema, outputItemsSchema } from '../types/schema';
import { DefaultAssetApiLimit } from '../utils/constants';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import ChainHandler from '../handlers/ChainHandler';

/**
 * setup available assets route
 * @param server
 */
const assetsRoute = (server: FastifySeverInstance) => {
  const querySchema = Type.Object({
    limit: Type.Number({ default: DefaultAssetApiLimit }),
    offset: Type.Number({ default: 0 }),
    chain: Type.Optional(Type.Enum({ ERGO_CHAIN, CARDANO_CHAIN })),
    tokenId: Type.Optional(Type.String()),
    tokenName: Type.Optional(Type.String()),
  });

  const assetsResponseSchema = outputItemsSchema(
    Type.Object({
      tokenId: Type.String(),
      tokenName: Type.String(),
      amount: Type.String(),
      chain: Type.Enum({ ERGO_CHAIN, CARDANO_CHAIN }),
    })
  );
  server.get(
    '/assets',
    {
      schema: {
        querystring: querySchema,
        response: {
          200: assetsResponseSchema,
          500: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { offset, limit, chain, tokenId, tokenName } = request.query;

      let assetList: Array<Asset> = [];
      const chains = chain ? [chain] : [ERGO_CHAIN, CARDANO_CHAIN];
      for (const currentChain of chains) {
        const chainInstance = ChainHandler.getInstance().getChain(currentChain);
        const assets = await chainInstance.getLockAddressAssets();
        const nativeTokenId =
          currentChain == ERGO_CHAIN
            ? ERG
            : currentChain == CARDANO_CHAIN
            ? ADA
            : '';
        // TODO: Fix asset name, https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/257
        assetList.push({
          tokenId: nativeTokenId,
          tokenName: nativeTokenId,
          amount: assets.nativeToken.toString(),
          chain: currentChain,
        });
        assets.tokens.forEach((token) => {
          assetList.push({
            tokenId: token.id,
            tokenName: token.id,
            amount: token.value.toString(),
            chain: currentChain,
          });
        });
      }

      if (tokenId) {
        assetList = assetList.filter((token) => token.tokenId == tokenId);
      }
      if (tokenName) {
        assetList = assetList.filter((token) => token.tokenName == tokenName);
      }
      const result = assetList.slice(offset, offset + limit);

      reply.status(200).send({
        items: result,
        total: assetList.length,
      });
    }
  );
};

const assetRoutes = async (server: FastifySeverInstance) => {
  assetsRoute(server);
};

export { assetRoutes };
