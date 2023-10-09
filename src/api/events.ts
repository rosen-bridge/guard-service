import { Type } from '@sinclair/typebox';
import { SortRequest } from '../types/api';
import { DefaultApiLimit } from '../utils/constants';
import { DatabaseAction } from '../db/DatabaseAction';
import {
  EventsQuerySchema,
  EventsResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
} from './schemas';

/**
 * setup event history route
 * @param server
 */
const eventsHistoryRoute = (server: FastifySeverInstance) => {
  server.get(
    '/event/history',
    {
      schema: {
        querystring: EventsQuerySchema,
        response: {
          200: EventsResponseSchema,
          500: MessageResponseSchema,
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

/**
 * setup event history route
 * @param server
 */
const ongoingEventsRoute = (server: FastifySeverInstance) => {
  server.get(
    '/event/ongoing',
    {
      schema: {
        querystring: EventsQuerySchema,
        response: {
          200: EventsResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sort, offset, limit, fromChain, toChain, maxAmount, minAmount } =
        request.query;

      const results = await DatabaseAction.getInstance().getOngoingEvents(
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
  ongoingEventsRoute(server);
};

export { eventRoutes };
