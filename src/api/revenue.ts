import { TokenChartData, TokenData } from '../types/api';
import { DatabaseAction } from '../db/DatabaseAction';
import { groupBy, reduce } from 'lodash-es';
import { extractRevenueFromView } from '../utils/revenue';
import {
  FastifySeverInstance,
  MessageResponseSchema,
  RevenueChartQuerySchema,
  RevenueChartResponseSchema,
  RevenueHistoryQuerySchema,
  RevenueHistoryResponseSchema,
} from './schemas';
import Configs from '../configs/Configs';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

/**
 * setup revenue history route
 * @param server
 */
const revenueHistoryRoute = (server: FastifySeverInstance) => {
  server.get(
    '/revenue/history',
    {
      schema: {
        querystring: RevenueHistoryQuerySchema,
        response: {
          200: RevenueHistoryResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const {
        sort,
        offset,
        limit,
        fromChain,
        toChain,
        tokenId,
        maxHeight,
        minHeight,
        fromBlockTime,
        toBlockTime,
      } = request.query;

      const dbAction = DatabaseAction.getInstance();
      const eventsRevenues = await dbAction.getRevenuesWithFilters(
        sort,
        fromChain,
        toChain,
        minHeight,
        maxHeight,
        fromBlockTime,
        toBlockTime,
        offset,
        limit
      );
      const revenues = await dbAction.getEventsRevenues(
        eventsRevenues.items.map((row) => row.id)
      );

      reply.status(200).send({
        items: await extractRevenueFromView(eventsRevenues.items, revenues),
        total: eventsRevenues.total,
      });
    }
  );
};

const revenueChartRoute = (server: FastifySeverInstance) => {
  server.get(
    '/revenue/chart',
    {
      schema: {
        querystring: RevenueChartQuerySchema,
        response: {
          200: RevenueChartResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { count, period } = request.query;

      const dbAction = DatabaseAction.getInstance();
      const results = await dbAction.getRevenueChartData(period);
      const resultsGroupedByTokenId = groupBy(results, 'tokenId');
      const returnData = reduce<
        typeof resultsGroupedByTokenId,
        TokenChartData[]
      >(
        resultsGroupedByTokenId,
        (acc, data, tokenId) => {
          const tokens = Configs.tokenMap.search(ERGO_CHAIN, {
            [Configs.tokenMap.getIdKey(ERGO_CHAIN)]: tokenId,
          });
          let name = 'Unsupported token';
          let decimals = 0;
          let isNativeToken = false;
          if (tokens.length) {
            name = tokens[0][ERGO_CHAIN].name;
            decimals = tokens[0][ERGO_CHAIN].decimals;
            isNativeToken = tokens[0][ERGO_CHAIN].metaData.type === 'native';
          }
          const tokenData: TokenData = {
            tokenId: tokenId,
            name: name,
            amount: 0,
            decimals: decimals,
            isNativeToken: isNativeToken,
          };
          return [
            ...acc,
            {
              title: tokenData,
              data: data
                .map((datum) => ({
                  label: (datum.label * 1000).toString(),
                  amount: datum.amount,
                }))
                .slice(0, count),
            },
          ];
        },
        []
      );
      reply.status(200).send(returnData);
    }
  );
};

const revenueRoutes = async (server: FastifySeverInstance) => {
  revenueHistoryRoute(server);
  revenueChartRoute(server);
};

export { revenueRoutes };
