import { LockBalance } from '../types/api';
import ChainHandler from '../handlers/ChainHandler';
import { getHealthCheck } from '../guard/HealthCheck';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../utils/constants';
import {
  FastifySeverInstance,
  InfoResponseSchema,
  MessageResponseSchema,
} from './schemas';
import { rosenConfig } from '../configs/RosenConfig';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { getTokenData } from '../utils/getTokenData';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import Configs from '../configs/Configs';
import packageJson from '../../package.json' assert { type: 'json' };

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

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
          200: InfoResponseSchema,
          500: MessageResponseSchema,
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
          const nativeTokenId = ChainNativeToken[chain];
          const abstractChain = chainHandler.getChain(chain);
          // TODO: improve getting chain native token
          //  local:ergo/rosen-bridge/guard-service#274
          const nativeTokenData = getTokenData(
            chain,
            nativeTokenId,
            chain,
            true
          );

          const hotAmount = (
            await abstractChain.getLockAddressAssets()
          ).nativeToken.toString();
          balances.hot.push({
            address: abstractChain.getChainConfigs().addresses.lock,
            chain: chain,
            balance: {
              tokenId: nativeTokenId,
              amount: Number(hotAmount),
              name: nativeTokenData.name!.toUpperCase(),
              decimals: nativeTokenData.decimals,
              isNativeToken: true,
            },
          });
          const coldAmount = (
            await abstractChain.getColdAddressAssets()
          ).nativeToken.toString();
          balances.cold.push({
            address: abstractChain.getChainConfigs().addresses.cold,
            chain: chain,
            balance: {
              tokenId: nativeTokenId,
              amount: Number(coldAmount),
              name: nativeTokenData.name!.toUpperCase(),
              decimals: nativeTokenData.decimals,
              isNativeToken: true,
            },
          });
        }
        const healthCheck = await getHealthCheck();
        const healthStatus = await healthCheck.getOverallHealthStatus();
        const trialErrors = await healthCheck.getTrialErrors();

        reply.status(200).send({
          versions: {
            app: packageJson.version,
            contract: rosenConfig.contractVersion,
            tokensMap: Configs.tokensVersion,
          },
          health: {
            status: healthStatus,
            trialErrors: trialErrors,
          },
          rsnTokenId: rosenConfig.RSN,
          emissionTokenId: GuardsErgoConfigs.emissionTokenId,
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
