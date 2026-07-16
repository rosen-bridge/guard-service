import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import TssHandler from '../handlers/tssHandler';
import { validateTrustKey } from '../utils/authentication';
import {
  MessageResponseSchema,
  TssCallbackParams,
  TssCallbackSchema,
} from './schemas';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * setups TSS sign route
 * @param server
 */
const signRoute = (server: FastifyWithZod) => {
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
      preHandler: [validateTrustKey],
    },
    async (request, reply) => {
      try {
        const { algorithm } = request.params;
        const { status, error, message, signature, signatureRecovery } =
          request.body;
        await TssHandler.getInstance().handleSignData(
          algorithm,
          status,
          error,
          message,
          signature,
          signatureRecovery,
        );
        reply.send({ message: 'ok' });
      } catch (error) {
        logger.warn(
          `An error occurred while processing TSS tx sign callback: ${error}`,
        );
        logger.warn(error.stack);
        reply.status(400).send({ message: error.message });
      }
    },
  );
};

const tssRoute = async (server: FastifyWithZod) => {
  signRoute(server);
};

export { tssRoute };
