import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import {
  FastifySeverInstance,
  LockBalanceSchema,
  MessageResponseSchema,
} from './schemas';
import BalanceHandler from '../handlers/balanceHandler';
import { LockBalance } from '../types/api';

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
        response: {
          200: LockBalanceSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        const balance: LockBalance = {
          hot: [],
          cold: [],
        };

        balance.hot =
          await BalanceHandler.getInstance().getAddressAssets('lock');
        balance.cold =
          await BalanceHandler.getInstance().getAddressAssets('cold');

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
