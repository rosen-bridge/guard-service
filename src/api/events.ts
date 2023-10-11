import { Type } from '@sinclair/typebox';
import { EventHistory, SortRequest, TokenData } from '../types/api';
import { DefaultApiLimit } from '../utils/constants';
import { DatabaseAction } from '../db/DatabaseAction';
import {
  EventsQuerySchema,
  EventsResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
} from './schemas';
import Configs from '../configs/Configs';

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
        .map((result): EventHistory => {
          const event = result.eventData;
          const token = Configs.tokenMap.search(event.fromChain, {
            [Configs.tokenMap.getIdKey(event.fromChain)]:
              event.sourceChainTokenId,
          })[0][event.fromChain];
          const tokenData: TokenData = {
            tokenId: event.sourceChainTokenId,
            amount: Number(event.amount),
            name: token.name,
            decimals: token.decimals,
            isNativeToken: token.metaData.type === 'native',
          };
          return {
            eventId: event.eventId,
            txId: event.txId,
            fromChain: event.fromChain,
            toChain: event.toChain,
            fromAddress: event.fromAddress,
            toAddress: event.toAddress,
            bridgeFee: event.bridgeFee,
            networkFee: event.networkFee,
            sourceChainToken: tokenData,
            sourceTxId: event.sourceTxId,
          };
        });

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
        .map((result): EventHistory => {
          const event = result.eventData;
          const token = Configs.tokenMap.search(event.fromChain, {
            [Configs.tokenMap.getIdKey(event.fromChain)]:
              event.sourceChainTokenId,
          })[0][event.fromChain];
          const tokenData: TokenData = {
            tokenId: event.sourceChainTokenId,
            amount: Number(event.amount),
            name: token.name,
            decimals: token.decimals,
            isNativeToken: token.metaData.type === 'native',
          };
          return {
            eventId: event.eventId,
            txId: event.txId,
            fromChain: event.fromChain,
            toChain: event.toChain,
            fromAddress: event.fromAddress,
            toAddress: event.toAddress,
            bridgeFee: event.bridgeFee,
            networkFee: event.networkFee,
            sourceChainToken: tokenData,
            sourceTxId: event.sourceTxId,
          };
        });

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
