import { ChainTokenData } from '../types/api';
import { SUPPORTED_CHAINS, ChainNativeToken } from '../utils/constants';
import ChainHandler from '../handlers/ChainHandler';
import Configs from '../configs/Configs';
import {
  AssetsQuerySchema,
  AssetsResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
} from './schemas';
import { getTokenData } from '../utils/getTokenData';

/**
 * setup available assets route
 * @param server
 */
const assetsRoute = (server: FastifySeverInstance) => {
  server.get(
    '/assets',
    {
      schema: {
        querystring: AssetsQuerySchema,
        response: {
          200: AssetsResponseSchema,
          400: MessageResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { offset, limit, chain, tokenId, name } = request.query;

      let tokenList: Array<ChainTokenData> = [];
      const chains = chain ? [chain] : SUPPORTED_CHAINS;
      for (const currentChain of chains) {
        const chainInstance = ChainHandler.getInstance().getChain(currentChain);
        const assets = await chainInstance.getLockAddressAssets();
        const coldAssets = await chainInstance.getColdAddressAssets();
        // TODO: fix native token name, https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/274
        const nativeTokenId = ChainNativeToken[currentChain] ?? '';
        // add native tokens
        const nativeTokenData = getTokenData(
          currentChain,
          nativeTokenId,
          currentChain,
          true
        );
        tokenList.push({
          tokenId: nativeTokenId,
          name: nativeTokenData.name,
          amount: Number(assets.nativeToken),
          coldAmount: Number(coldAssets.nativeToken),
          decimals: nativeTokenData.decimals,
          chain: currentChain,
          isNativeToken: true,
        });
        // add tokens
        assets.tokens.forEach((token) => {
          const tokenData = getTokenData(
            currentChain,
            token.id,
            currentChain,
            true
          );
          const coldToken = coldAssets.tokens.find(
            (coldToken) => coldToken.id === token.id
          );
          tokenList.push({
            tokenId: token.id,
            name: tokenData.name,
            amount: Number(token.value),
            coldAmount: coldToken ? Number(coldToken.value) : 0,
            decimals: tokenData.decimals,
            chain: currentChain,
            isNativeToken: false,
          });
        });
      }

      if (tokenId) {
        tokenList = tokenList.filter((token) => token.tokenId == tokenId);
        // add requested token if does not exists
        if (tokenList.length === 0) {
          let tokenData: ChainTokenData | undefined;
          for (const currentChain of chains) {
            const tokens = Configs.tokenMap.search(currentChain, {
              [Configs.tokenMap.getIdKey(currentChain)]: tokenId,
            });
            const significantDecimals =
              Configs.tokenMap.getSignificantDecimals(tokenId);
            if (tokens.length) {
              tokenData = {
                tokenId: tokenId,
                name: tokens[0][currentChain].name,
                amount: 0,
                coldAmount: 0,
                decimals: significantDecimals!,
                chain: currentChain,
                isNativeToken:
                  tokens[0][currentChain].metaData.type === 'native',
              };
              break;
            }
          }
          if (!tokenData) reply.status(400).send({ message: `Unknown token` });
          else tokenList.push(tokenData);
        }
      }
      if (name) {
        tokenList = tokenList.filter((token) => token.name == name);
      }
      const result = tokenList.slice(offset, offset + limit);

      reply.status(200).send({
        items: result,
        total: tokenList.length,
      });
    }
  );
};

const assetRoutes = async (server: FastifySeverInstance) => {
  assetsRoute(server);
};

export { assetRoutes };
