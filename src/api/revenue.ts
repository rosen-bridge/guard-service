import { Type } from '@sinclair/typebox';
import {
  FastifySeverInstance,
  SortRequest,
  TokenChartData,
} from '../types/api';
import { messageResponseSchema, outputItemsSchema } from '../types/schema';
import { DatabaseAction } from '../db/DatabaseAction';
import {
  DefaultApiLimit,
  DefaultRevenueApiCount,
  RevenuePeriod,
} from '../utils/constants';
import { groupBy, reduce } from 'lodash-es';

/**
 * setup revenue history route
 * @param server
 */
const revenueHistoryRoute = (server: FastifySeverInstance) => {
  const querySchema = Type.Object({
    limit: Type.Number({ default: DefaultApiLimit }),
    offset: Type.Number({ default: 0 }),
    sort: Type.Optional(Type.Enum(SortRequest)),
    fromChain: Type.Optional(Type.String()),
    toChain: Type.Optional(Type.String()),
    tokenId: Type.Optional(Type.String()),
    maxHeight: Type.Optional(Type.Number()),
    minHeight: Type.Optional(Type.Number()),
    fromBlockTime: Type.Optional(Type.Number()),
    toBlockTime: Type.Optional(Type.Number()),
  });
  const historyResponseSchema = outputItemsSchema(
    Type.Object({
      rewardTxId: Type.String(),
      eventId: Type.String(),
      lockHeight: Type.Number(),
      fromChain: Type.String(),
      toChain: Type.String(),
      fromAddress: Type.String(),
      toAddress: Type.String(),
      amount: Type.String(),
      bridgeFee: Type.String(),
      networkFee: Type.String(),
      lockTokenId: Type.String(),
      lockTxId: Type.String(),
      height: Type.Number(),
      timestamp: Type.Number(),
      revenueTokenId: Type.String(),
      revenueAmount: Type.String(),
    } as const)
  );
  server.get(
    '/revenue/history',
    {
      schema: {
        querystring: querySchema,
        response: {
          200: historyResponseSchema,
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
      const results = await dbAction.getRevenuesWithFilters(
        sort,
        fromChain,
        toChain,
        tokenId,
        minHeight,
        maxHeight,
        fromBlockTime,
        toBlockTime
      );
      const revenues = results.slice(offset, offset + limit);

      reply.status(200).send({
        items: revenues.map((revenue) => ({
          ...revenue,
          revenueAmount: revenue.revenueAmount.toString(),
        })),
        total: results.length,
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
