import Tss from '../guard/Tss';
import { TssAlgorithms } from '../utils/constants';
import {
  FastifySeverInstance,
  MessageResponseSchema,
  TssCallbackParams,
  TssCallbackSchema,
} from './schemas';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

/**
 * setups TSS sign route
 * @param server
 */
const signRoute = (server: FastifySeverInstance) => {
  server.post(
    '/tss/sign/:algorithm',
    {
      schema: {
        params: TssCallbackParams,
        body: TssCallbackSchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { algorithm } = request.params;
        const { status, error, message, signature, signatureRecovery } =
          request.body;
        await Tss.getInstance().handleSignData(
          algorithm,
          status,
          error,
          message,
          signature,
          signatureRecovery
        );
        reply.send({ message: 'ok' });
      } catch (error) {
        logger.warn(
          `An error occurred while processing TSS curve tx sign callback: ${error}`
        );
        logger.warn(error.stack);
        reply.status(400).send({ message: error.message });
      }
    }
  );
};

const tssRoute = async (server: FastifySeverInstance) => {
  signRoute(server);
};

export { tssRoute };
