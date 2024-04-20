import { Type } from '@sinclair/typebox';
import Tss from '../guard/Tss';
import { FastifySeverInstance, MessageResponseSchema } from './schemas';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

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
    trustKey: Type.String(),
  });
  server.post(
    '/tss/sign',
    {
      schema: {
        body: bodySchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { status, error, message, signature, trustKey } = request.body;
        if (trustKey !== Tss.getTrustKey()) {
          logger.warn(
            `Received message on Tss tx sign callback with wrong trust key`
          );
          reply.status(400).send({ message: 'Trust key is wrong' });
        }
        await Tss.getInstance().handleSignData(
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
        reply.status(400).send({ message: error.message });
      }
    }
  );
};

const tssRoute = async (server: FastifySeverInstance) => {
  signRoute(server);
};

export { tssRoute };
