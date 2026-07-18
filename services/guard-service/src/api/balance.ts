import { groupBy, keyBy } from 'lodash-es';
import z from 'zod';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import {
  Filter,
  FilterParser,
  StringFilterField,
} from '@rosen-bridge/query-params';

import { DatabaseAction } from '../db/databaseAction';
import { SupportedChain } from '../types/config';
import { getTokenData } from '../utils/getTokenData';
import {
  AddressBalanceSchema,
  BALANCE_ROUTE_PARSER_SCHEMA,
  BalanceResponseSchema,
  MessageResponseSchema,
} from './schemas';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * Gets the balance
 * @param server
 */
const getBalanceRoute = (server: FastifyWithZod) => {
  const filterParser = new FilterParser(BALANCE_ROUTE_PARSER_SCHEMA);

  server.get(
    '/balance',
    {
      schema: {
        response: {
          200: BalanceResponseSchema,
          400: MessageResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      let filter: Filter;
      let queryFilter: Record<string, StringFilterField | undefined>;

      try {
        // TODO: `http://localhost` should be removed (local:ergo/rosen-bridge/utils/356)
        filter = filterParser.parse(`http://localhost${request.url}`);

        queryFilter = keyBy<StringFilterField | undefined>(
          (filter.fields as StringFilterField[]) ?? [],
          'key',
        );
      } catch (error) {
        reply.status(400).send({
          message: `${error}`,
        });
        return;
      }

      try {
        const { items: tokenIds, total } =
          await DatabaseAction.getInstance().getChainAddressBalanceTokenIds(
            queryFilter.chain?.value as SupportedChain,
            queryFilter.tokenId?.value,
            filter.pagination!.offset,
            filter.pagination!.limit,
            filter.sorts,
          );

        const { items: balances } =
          await DatabaseAction.getInstance().getChainAddressBalances(
            tokenIds,
            filter.sorts,
          );

        const items = Object.values(groupBy(balances, 'tokenId')).map(
          (balances) => {
            const tokenData = getTokenData(
              balances[0].address.chain,
              balances[0].tokenId,
              balances[0].address.chain,
              true,
            );

            const result: z.infer<typeof AddressBalanceSchema> = {
              chain: balances[0].address.chain,
              token: {
                id: tokenData.tokenId,
                name: tokenData.name!,
                decimals: tokenData.decimals,
                isNativeToken: tokenData.isNativeToken,
              },
            };

            balances.forEach((record) => {
              result[record.address.type] = {
                address: record.address.address,
                amount: record.balance.toString(),
              };
            });

            return result;
          },
        );

        reply.status(200).send({ items, total });
      } catch (error) {
        logger.error(`An error occurred while fetching balance: ${error}`);
        if (error.stack) logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    },
  );
};

const balanceRoutes = async (server: FastifyWithZod) => {
  getBalanceRoute(server);
};

export { balanceRoutes };
