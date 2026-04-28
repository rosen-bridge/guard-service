import { DefaultLogger } from '@rosen-bridge/abstract-logger';

import BalanceHandler from '../handlers/balanceHandler';
import ChainHandler from '../handlers/chainHandler';
import { LockBalance } from '../types/api';
import {
  BalanceQuerySchema,
  FastifySeverInstance,
  LockBalanceSchema,
  MessageResponseSchema,
} from './schemas';

const logger = DefaultLogger.getInstance().child(import.meta.url);

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

        const balances = await BalanceHandler.getInstance().getAddressAssets(
          ['lock', 'cold'],
          chain,
          tokenId,
          offset,
          limit,
        );

        for (const addressBalance of balances.items) {
          const chainConfig = ChainHandler.getInstance()
            .getChain(addressBalance.chain)
            .getChainConfigs();

          if (chainConfig.addresses.cold === addressBalance.address) {
            balance.cold.items.push(addressBalance);
            balance.cold.total += 1;
          } else {
            balance.hot.items.push(addressBalance);
            balance.hot.total += 1;
          }
        }

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
