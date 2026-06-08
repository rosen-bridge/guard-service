import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { TransactionType } from '@rosen-chains/abstract-chain';

import { DatabaseAction } from '../db/databaseAction';
import { Event, OngoingEvents, TokenData } from '../types/api';
import { EventStatus } from '../utils/constants';
import { getTokenData } from '../utils/getTokenData';
import {
  EventsQuerySchema,
  EventsHistoryResponseSchema,
  MessageResponseSchema,
  OngoingEventsResponseSchema,
} from './schemas';

/**
 * setup event history route
 * @param server
 */
const eventsHistoryRoute = (server: FastifyWithZod) => {
  server.get(
    '/event/history',
    {
      schema: {
        querystring: EventsQuerySchema,
        response: {
          200: EventsHistoryResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sort, offset, limit, fromChain, toChain, maxAmount, minAmount } =
        request.query;

      const dbAction = DatabaseAction.getInstance();
      const results = await dbAction.getEvents(
        true,
        sort,
        fromChain,
        toChain,
        minAmount,
        maxAmount,
        offset,
        limit,
      );

      const events = results.items.map((event): Event => {
        const token = getTokenData(
          event.fromChain,
          event.sourceChainTokenId,
          event.fromChain,
          true,
        );

        const tokenData: TokenData = {
          tokenId: event.sourceChainTokenId,
          amount: Number(event.amount),
          name: token.name,
          decimals: token.decimals,
          isNativeToken: token.isNativeToken,
        };

        let status = '';
        if (event.status) {
          status = event.reason ? 'multiple-flows' : event.status;
        } else if (event.reason) {
          status = 'rejected';
        } else {
          status = 'waiting-for-confirmation';
        }

        return {
          eventId: event.eventId,
          fromChain: event.fromChain,
          toChain: event.toChain,
          fromAddress: event.fromAddress,
          toAddress: event.toAddress,
          bridgeFee: event.bridgeFee,
          networkFee: event.networkFee,
          sourceChainToken: tokenData,
          sourceTxId: event.sourceTxId,
          paymentTxId: event.paymentTxId ?? '',
          rewardTxId: event.spendTxId ?? '',
          status,
        };
      });

      reply.status(200).send({
        items: events,
        total: results.total,
      });
    },
  );
};

/**
 * setup event history route
 * @param server
 */
const ongoingEventsRoute = (server: FastifyWithZod) => {
  server.get(
    '/event/ongoing',
    {
      schema: {
        querystring: EventsQuerySchema,
        response: {
          200: OngoingEventsResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sort, offset, limit, fromChain, toChain, maxAmount, minAmount } =
        request.query;

      const dbAction = DatabaseAction.getInstance();
      const results = await dbAction.getEvents(
        false,
        sort,
        fromChain,
        toChain,
        minAmount,
        maxAmount,
        offset,
        limit,
      );

      const txs = await dbAction.getValidTxsForEvents(
        results.items.map((event) => event.eventId),
      );

      const events = results.items.map((event): OngoingEvents => {
        const token = getTokenData(
          event.fromChain,
          event.sourceChainTokenId,
          event.fromChain,
          true,
        );

        const tokenData: TokenData = {
          tokenId: event.sourceChainTokenId,
          amount: Number(event.amount),
          name: token.name,
          decimals: token.decimals,
          isNativeToken: token.isNativeToken,
        };

        let status = event.status;
        if (status) {
          if (event.reason) {
            status = 'multiple-flows';
          } else if (
            [EventStatus.inPayment, EventStatus.inReward].includes(status)
          ) {
            const txStatus = txs.find(
              (tx) =>
                tx.event?.id === event.eventId &&
                tx.type ===
                  (status === EventStatus.inPayment
                    ? TransactionType.payment
                    : TransactionType.reward),
            )!.status;
            status = `${status} (${txStatus})`;
          }
        } else if (event.reason) {
          status = 'rejected';
        } else {
          status = 'waiting-for-confirmation';
        }

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
          status,
        };
      });

      reply.status(200).send({
        items: events,
        total: results.total,
      });
    },
  );
};

const eventRoutes = async (server: FastifyWithZod) => {
  eventsHistoryRoute(server);
  ongoingEventsRoute(server);
};

export { eventRoutes };
