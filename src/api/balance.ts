import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import {
  FastifySeverInstance,
  LockBalanceSchema,
  MessageResponseSchema,
} from './schemas';
import BalanceHandler from '../handlers/BalanceHandler';
import { getTokenData } from '../utils/getTokenData';
import { LockBalance } from '../types/api';
import { SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from '../handlers/ChainHandler';

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
        const lockAddresses: Set<string> = new Set();
        for (const chain of SUPPORTED_CHAINS) {
          const chainConfig = ChainHandler.getInstance()
            .getChain(chain)
            .getChainConfigs();
          lockAddresses.add(chainConfig.addresses.lock);
        }

        const balances = await BalanceHandler.getInstance().getBalances();

        const lockBalance: LockBalance = {
          cold: [],
          hot: [],
        };

        for (const balance of balances) {
          const tokenData = getTokenData(
            balance.chain,
            balance.tokenId,
            balance.chain,
            true
          );

          const balanceObj = {
            address: balance.address,
            chain: balance.chain,
            balance: {
              tokenId: balance.tokenId,
              amount: Number(balance.balance),
              name: tokenData.name!.toUpperCase(),
              decimals: tokenData.decimals,
              isNativeToken: true,
            },
          };

          if (lockAddresses.has(balance.address)) {
            lockBalance.hot.push(balanceObj);
          } else {
            lockBalance.cold.push(balanceObj);
          }
        }

        reply.status(200).send(lockBalance);
      } catch (error) {
        logger.error(`An error occurred while fetching balance: ${error}`);
        logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    }
  );
};

const balanceRoutes = async (server: FastifySeverInstance) => {
  getBalanceRoute(server);
};

export { balanceRoutes };
