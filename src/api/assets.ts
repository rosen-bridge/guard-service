import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';

import { ChainTokenData } from '../types/api';
import { SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from '../handlers/ChainHandler';
import Configs from '../configs/Configs';
import {
  AssetsQuerySchema,
  AssetsResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
} from './schemas';
import { RosenChainToken } from '@rosen-bridge/tokens';

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

      let tokenList: Array<ChainTokenData> = [];
      const chains = chain ? [chain] : SUPPORTED_CHAINS;
      for (const currentChain of chains) {
        const chainInstance = ChainHandler.getInstance().getChain(currentChain);
        const assets = await chainInstance.getLockAddressAssets();
        const coldAssets = await chainInstance.getColdAddressAssets();
        // TODO: fix native token name, https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/274
        const nativeTokenId =
          currentChain == ERGO_CHAIN
            ? ERG
            : currentChain == CARDANO_CHAIN
            ? ADA
            : '';
        // add native tokens
        const nativeTokenData = Configs.tokenMap.search(currentChain, {
          [Configs.tokenMap.getIdKey(currentChain)]: nativeTokenId,
        })[0][currentChain];
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
          const tokenData = Configs.tokenMap.search(currentChain, {
            [Configs.tokenMap.getIdKey(currentChain)]: token.id,
          });
          const coldToken = coldAssets.tokens.find(
            (coldToken) => coldToken.id === token.id
          );
          tokenList.push({
            tokenId: token.id,
            name: tokenData.length
              ? tokenData[0][currentChain].name
              : 'Unsupported token',
            amount: Number(token.value),
            coldAmount: coldToken ? Number(coldToken.value) : 0,
            decimals: tokenData.length
              ? tokenData[0][currentChain].decimals
              : 0,
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
          for (const chain of chains) {
            const tokens = Configs.tokenMap.search(chain, {
              [Configs.tokenMap.getIdKey(chain)]: tokenId,
            });
            if (tokens.length) {
              tokenData = {
                tokenId: tokenId,
                name: tokens[0][chain].name,
                amount: 0,
                coldAmount: 0,
                decimals: tokens[0][chain].decimals,
                chain: chain,
                isNativeToken: tokens[0][chain].metadata.type === 'native',
              };
              break;
            }
          }
          tokenList.push(
            tokenData ?? {
              tokenId: tokenId,
              name: 'Unsupported token',
              amount: 0,
              coldAmount: 0,
              decimals: 0,
              chain: 'unknown',
              isNativeToken: false,
            }
          );
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
