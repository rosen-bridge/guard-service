import { loggerFactory } from '../log/Logger';
import { Type } from '@sinclair/typebox';
import { FastifySeverInstance, MessageResponseSchema } from './types';

const logger = loggerFactory(import.meta.url);

/**
 * setups TSS keygen completed route
 * @param server
 */
const keygenCompleteRoute = (server: FastifySeverInstance) => {
  const bodySchema = Type.Object({
    status: Type.String(),
    error: Type.Optional(Type.String()),
    shareID: Type.Optional(Type.String()),
    pubKey: Type.Optional(Type.String()),
  });
  server.post(
    '/tss/keygen',
    {
      schema: {
        body: bodySchema,
        response: {
          200: MessageResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    (request, reply) => {
      reply.send({ message: 'ok' });
      logger.info(
        `request start keygen with response ${JSON.stringify(
          request.body
        )} called`
      );
    }
  );
};

const keygenRoute = async (server: FastifySeverInstance) => {
  keygenCompleteRoute(server);
};

export { keygenRoute };
