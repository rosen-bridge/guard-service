import { Type } from '@sinclair/typebox';
import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance, SortRequest } from '../types/api';
import { messageResponseSchema, outputItemsSchema } from '../types/schema';
import { DefaultApiLimit } from '../utils/constants';
import { DatabaseAction } from '../db/DatabaseAction';

const logger = loggerFactory(import.meta.url);

/**
 * setup event history route
 * @param server
 */
const eventsHistoryRoute = (server: FastifySeverInstance) => {
  const querySchema = Type.Object({
    limit: Type.Number({ default: DefaultApiLimit }),
    offset: Type.Number({ default: 0 }),
    sort: Type.Optional(Type.Enum(SortRequest)),
    fromChain: Type.Optional(Type.String()),
    toChain: Type.Optional(Type.String()),
    maxAmount: Type.Optional(Type.String()),
    minAmount: Type.Optional(Type.String()),
  });
  const historyResponseSchema = outputItemsSchema(
    Type.Object({
      eventId: Type.String(),
      block: Type.String(),
      height: Type.Number(),
      fromChain: Type.String(),
      toChain: Type.String(),
      fromAddress: Type.String(),
      toAddress: Type.String(),
      amount: Type.String(),
      bridgeFee: Type.String(),
      networkFee: Type.String(),
      sourceChainTokenId: Type.String(),
      targetChainTokenId: Type.String(),
      sourceChainHeight: Type.Number(),
      sourceBlockId: Type.String(),
      sourceTxId: Type.String(),
      WIDs: Type.String(),
    } as const)
  );
  server.get(
    '/event/history',
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
      const { sort, offset, limit, fromChain, toChain, maxAmount, minAmount } =
        request.query;

      const results = await DatabaseAction.getInstance().getCompletedEvents(
        sort,
        fromChain,
        toChain,
        minAmount,
        maxAmount
      );

      const events = results
        .slice(offset, offset + limit)
        .map((result) => result.eventData);

      reply.status(200).send({
        items: events,
        total: results.length,
      });
    }
  );
};

const eventRoutes = async (server: FastifySeverInstance) => {
  eventsHistoryRoute(server);
};

export { eventRoutes };
