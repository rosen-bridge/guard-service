import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import { Token } from '../types/api';
import { SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from '../handlers/ChainHandler';
import Configs from '../configs/Configs';
import {
  AssetsQuerySchema,
  AssetsResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
} from './types';

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
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { offset, limit, chain, tokenId, name } = request.query;

      let tokenList: Array<Token> = [];
      const chains = chain ? [chain] : SUPPORTED_CHAINS;
      for (const currentChain of chains) {
        const chainInstance = ChainHandler.getInstance().getChain(currentChain);
        const assets = await chainInstance.getLockAddressAssets();
        // TODO: fix native token name, https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/274
        const nativeTokenId =
          currentChain == ERGO_CHAIN
            ? ERG
            : currentChain == CARDANO_CHAIN
            ? ADA
            : '';
        const nativeTokenData = Configs.tokenMap.search(currentChain, {
          [Configs.tokenMap.getIdKey(currentChain)]: nativeTokenId,
        })[0][currentChain];
        tokenList.push({
          tokenId: nativeTokenId,
          name: nativeTokenData.name,
          amount: assets.nativeToken.toString(),
          decimals: nativeTokenData.decimals,
          chain: currentChain,
        });
        assets.tokens.forEach((token) => {
          const tokenData = Configs.tokenMap.search(currentChain, {
            [Configs.tokenMap.getIdKey(currentChain)]: token.id,
          });
          tokenList.push({
            tokenId: token.id,
            name: tokenData.length
              ? tokenData[0][currentChain].name
              : 'Unsupported token',
            amount: token.value.toString(),
            decimals: tokenData.length
              ? tokenData[0][currentChain].decimals
              : 0,
            chain: currentChain,
          });
        });
      }

      if (tokenId) {
        tokenList = tokenList.filter((token) => token.tokenId == tokenId);
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
