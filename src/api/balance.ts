import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

import BalanceHandler from '../handlers/balanceHandler';
import { LockBalance } from '../types/api';
import {
  BalanceQuerySchema,
  FastifySeverInstance,
  LockBalanceSchema,
  MessageResponseSchema,
} from './schemas';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * Gets the balance
 * @param server
 */
const getBalanceRoute = (server: FastifySeverInstance) => {
  server.get(
    '/balance',
    {
      schema: {
        querystring: BalanceQuerySchema,
        response: {
          200: LockBalanceSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { offset, limit, chain, tokenId } = request.query;

      try {
        const balance: LockBalance = {
          hot: { items: [], total: 0 },
          cold: { items: [], total: 0 },
        };

        balance.hot = await BalanceHandler.getInstance().getAddressAssets(
          'lock',
          chain,
          tokenId,
          offset,
          limit,
        );
        balance.cold = await BalanceHandler.getInstance().getAddressAssets(
          'cold',
          chain,
          tokenId,
          offset,
          limit,
        );

        reply.status(200).send(balance);
      } catch (error) {
        logger.error(`An error occurred while fetching balance: ${error}`);
        if (error.stack) logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    },
  );
};

const balanceRoutes = async (server: FastifySeverInstance) => {
  getBalanceRoute(server);
};

export { balanceRoutes };
