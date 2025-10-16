import { getHealthCheck } from '../guard/healthCheck';
import {
  FastifySeverInstance,
  InfoResponseSchema,
  MessageResponseSchema,
} from './schemas';
import { rosenConfig } from '../configs/rosenConfig';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import packageJson from '../../package.json' with { type: 'json' };

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
        const healthCheck = await getHealthCheck();
        const healthStatus = await healthCheck.getOverallHealthStatus();
        const trialErrors = await healthCheck.getTrialErrors();

        reply.status(200).send({
          versions: {
            app: packageJson.version,
            contract: rosenConfig.contractVersion,
          },
          health: {
            status: healthStatus,
            trialErrors: trialErrors,
          },
          rsnTokenId: rosenConfig.RSN,
          emissionTokenId: GuardsErgoConfigs.emissionTokenId,
        });
      } catch (error) {
        logger.error(`An error occurred while fetching general info: ${error}`);
        logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    },
  );
};

const generalInfoRoute = async (server: FastifySeverInstance) => {
  infoRoute(server);
};

export { generalInfoRoute };
