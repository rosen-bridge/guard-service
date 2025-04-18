import { Event, OngoingEvents, TokenData } from '../types/api';
import { EventStatus } from '../utils/constants';
import { DatabaseAction } from '../db/DatabaseAction';
import {
  EventsQuerySchema,
  EventsHistoryResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
  OngoingEventsResponseSchema,
} from './schemas';
import { TransactionType } from '@rosen-chains/abstract-chain';
import { getTokenData } from '../utils/getTokenData';

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
        limit
      );

      const events = results.items.map((event): Event => {
        const token = getTokenData(
          event.fromChain,
          event.sourceChainTokenId,
          event.fromChain,
          true
        );

        const tokenData: TokenData = {
          tokenId: event.sourceChainTokenId,
          amount: Number(event.amount),
          name: token.name,
          decimals: token.decimals,
          isNativeToken: token.isNativeToken,
        };

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
          status: event.result ?? event.status ?? 'not confirmed yet',
        };
      });

      reply.status(200).send({
        items: events,
        total: results.total,
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
        limit
      );

      const txs = await dbAction.getValidTxsForEvents(
        results.items.map((event) => event.eventId)
      );

      const events = results.items.map((event): OngoingEvents => {
        const token = getTokenData(
          event.fromChain,
          event.sourceChainTokenId,
          event.fromChain,
          true
        );

        const tokenData: TokenData = {
          tokenId: event.sourceChainTokenId,
          amount: Number(event.amount),
          name: token.name,
          decimals: token.decimals,
          isNativeToken: token.isNativeToken,
        };

        let status = '';
        switch (event.status) {
          case EventStatus.inPayment: {
            const paymentTxStatus = txs.find(
              (tx) =>
                tx.event.id === event.eventId &&
                tx.type === TransactionType.payment
            )!.status;
            status = `${EventStatus.inPayment} (${paymentTxStatus})`;
            break;
          }
          case EventStatus.inReward: {
            const rewardTxStatus = txs.find(
              (tx) =>
                tx.event.id === event.eventId &&
                tx.type === TransactionType.reward
            )!.status;
            status = `${EventStatus.inReward} (${rewardTxStatus})`;
            break;
          }
          default:
            status = event.status;
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
          status: status,
        };
      });

      reply.status(200).send({
        items: events,
        total: results.total,
      });
    }
  );
};

const eventRoutes = async (server: FastifySeverInstance) => {
  eventsHistoryRoute(server);
  ongoingEventsRoute(server);
};

export { eventRoutes };
