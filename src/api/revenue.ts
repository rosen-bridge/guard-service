import { Type } from '@sinclair/typebox';
import { FastifySeverInstance, TokenChartData } from '../types/api';
import {
  messageResponseSchema,
  RevenueHistoryResponse,
  RevenueHistoryQuery,
} from '../types/schema';
import { DatabaseAction } from '../db/DatabaseAction';
import { DefaultRevenueApiCount, RevenuePeriod } from '../utils/constants';
import { groupBy, reduce } from 'lodash-es';
import { extractRevenueFromView } from '../utils/revenue';

/**
 * setup revenue history route
 * @param server
 */
const revenueHistoryRoute = (server: FastifySeverInstance) => {
  server.get(
    '/revenue/history',
    {
      schema: {
        querystring: RevenueHistoryQuery,
        response: {
          200: RevenueHistoryResponse,
          500: messageResponseSchema,
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
      const events = await dbAction.getRevenuesWithFilters(
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
        events.map((row) => row.id)
      );

      reply.status(200).send({
        items: await extractRevenueFromView(events, revenues),
        total: events.length,
      });
    }
  );
};

const revenueChartRoute = (server: FastifySeverInstance) => {
  const querySchema = Type.Object({
    count: Type.Number({ default: DefaultRevenueApiCount }),
    period: Type.Enum(RevenuePeriod),
  });
  const chartResponseSchema = Type.Object({
    title: Type.String(),
    data: Type.Array(
      Type.Object({
        label: Type.String(),
        amount: Type.String(),
      })
    ),
  });
  server.get(
    '/revenue/chart',
    {
      schema: {
        querystring: querySchema,
        response: {
          200: Type.Array(chartResponseSchema),
          500: messageResponseSchema,
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
        (acc, data, tokenId) => [
          ...acc,
          {
            title: tokenId,
            data: data
              .map((datum) => ({
                label: new Date(datum.label).toISOString(),
                amount: datum.amount,
              }))
              .slice(0, count),
          },
        ],
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
