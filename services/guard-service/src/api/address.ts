import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { DatabaseAction } from '../db/databaseAction';
import {
  AddressQuerySchema,
  AddressResponseSchema,
  MessageResponseSchema,
} from './schemas';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * Gets the address entity records
 * @param server
 */
const getAddressRoute = (server: FastifyWithZod) => {
  server.get(
    '/address',
    {
      schema: {
        querystring: AddressQuerySchema,
        response: {
          200: AddressResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { offset, limit, chain, type } = request.query;

      try {
        const addresses = await DatabaseAction.getInstance().getAddresses(
          chain,
          type,
          offset,
          limit,
        );
        reply.status(200).send(addresses);
      } catch (error) {
        logger.error(`An error occurred while fetching addresses: ${error}`);
        if (error.stack) logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    },
  );
};

const addressRoutes = async (server: FastifyWithZod) => {
  getAddressRoute(server);
};

export { addressRoutes };
