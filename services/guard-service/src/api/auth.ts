import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import Configs from '../configs/configs';
import { authenticateKey } from '../utils/authentication';
import { MessageResponseSchema } from './schemas';

/**
 * setup token validation route
 * @param server
 */
const tokenValidationRoute = (server: FastifyWithZod) => {
  server.get(
    '/auth',
    {
      config: {
        rateLimit: {
          max: Configs.apiTokeValidationRateLimit,
        },
      },
      schema: {
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
        security: [{ apiKey: [] }],
      },
      preHandler: [authenticateKey],
    },
    async (request, reply) => {
      reply.send({ message: 'ok' });
    },
  );
};

const authRoutes = async (server: FastifyWithZod) => {
  tokenValidationRoute(server);
};

export { authRoutes };
