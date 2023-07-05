import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance } from '../types/api';
import { Type } from '@sinclair/typebox';
import { messageResponseSchema } from '../types/schema';
import Tss from '../guard/Tss';

const logger = loggerFactory(import.meta.url);

/**
 * setups TSS sign route
 * @param server
 */
const signRoute = (server: FastifySeverInstance) => {
  const bodySchema = Type.Object({
    status: Type.String(),
    error: Type.Optional(Type.String()),
    message: Type.String(),
    signature: Type.Optional(Type.String()),
  });
  server.post(
    '/tss/sign',
    {
      schema: {
        body: bodySchema,
        response: {
          200: messageResponseSchema,
          500: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { status, error, message, signature } = request.body;
        await Tss.getInstance().signHandlerWrapper(
          status,
          error,
          message,
          signature
        );
        reply.send({ message: 'ok' });
      } catch (error) {
        logger.warn(
          `An error occurred while processing TSS tx sign callback: ${error}`
        );
        logger.warn(error.stack);
        reply.status(500).send({ message: error.message });
      }
    }
  );
};

const tssRoute = async (server: FastifySeverInstance) => {
  signRoute(server);
};

export { tssRoute };
