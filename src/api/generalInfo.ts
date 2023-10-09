import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance, LockBalance } from '../types/api';
import { infoResponseSchema, messageResponseSchema } from '../types/schema';
import ChainHandler from '../handlers/ChainHandler';
import { getHealthCheck } from '../guard/HealthCheck';
import { SUPPORTED_CHAINS } from '../utils/constants';
import Configs from '../configs/Configs';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA } from '@rosen-chains/cardano';

const logger = loggerFactory(import.meta.url);

/**
 * Gets the general info of the service
 * @param server
 */
const infoRoute = (server: FastifySeverInstance) => {
  server.get(
    '/info',
    {
      schema: {
        response: {
          200: infoResponseSchema,
          500: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const chainHandler = ChainHandler.getInstance();

        const balances: LockBalance = {
          hot: [],
          cold: [],
        };
        for (const chain of SUPPORTED_CHAINS) {
          const nativeTokenId = chain === ERGO_CHAIN ? ERG : ADA;
          const abstractChain = chainHandler.getChain(chain);
          // TODO: improve getting chain native token
          //  local:ergo/rosen-bridge/guard-service#274
          const nativeTokenData = Configs.tokenMap.search(chain, {
            [Configs.tokenMap.getIdKey(chain)]: nativeTokenId,
          })[0][chain];

          const hotAmount = (
            await abstractChain.getLockAddressAssets()
          ).nativeToken.toString();
          balances.hot.push({
            address: abstractChain.getChainConfigs().addresses.lock,
            balance: {
              tokenId: nativeTokenId,
              amount: Number(hotAmount),
              name: nativeTokenData.name,
              decimals: nativeTokenData.decimals,
              isNativeToken: true,
            },
          });
          const coldAmount = (
            await abstractChain.getColdAddressAssets()
          ).nativeToken.toString();
          balances.cold.push({
            address: abstractChain.getChainConfigs().addresses.cold,
            balance: {
              tokenId: nativeTokenId,
              amount: Number(coldAmount),
              name: nativeTokenData.name,
              decimals: nativeTokenData.decimals,
              isNativeToken: true,
            },
          });
        }

        reply.status(200).send({
          health: (await (await getHealthCheck()).getOverallHealthStatus())
            .status,
          balances: balances,
        });
      } catch (error) {
        logger.error(`An error occurred while fetching general info: ${error}`);
        logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    }
  );
};

const generalInfoRoute = async (server: FastifySeverInstance) => {
  infoRoute(server);
};

export { generalInfoRoute };
