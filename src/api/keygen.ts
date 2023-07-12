import { exit } from 'process';
import { FastifySeverInstance } from '../types/api';
import { Type } from '@sinclair/typebox';
import { messageResponseSchema } from '../types/schema';

/**
 * setups TSS keygen completed route
 * @param server
 */
const keygenCompleteRoute = (server: FastifySeverInstance) => {
  const bodySchema = Type.Object({
    status: Type.String(),
    error: Type.Optional(Type.String()),
  });
  server.post(
    '/tss/keygen',
    {
      schema: {
        body: bodySchema,
        response: {
          200: messageResponseSchema,
          500: messageResponseSchema,
        },
      },
    },
    (request, reply) => {
      reply.send({ message: 'ok' });
      exit(request.body.status === 'success' ? 0 : 1);
    }
  );
};

const keygenRoute = async (server: FastifySeverInstance) => {
  keygenCompleteRoute(server);
};

export { keygenRoute };
