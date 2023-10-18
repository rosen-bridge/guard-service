import { EventHistory, OngoingEvents, TokenData } from '../types/api';
import { EventStatus } from '../utils/constants';
import { DatabaseAction } from '../db/DatabaseAction';
import {
  EventsQuerySchema,
  EventsHistoryResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
  OngoingEventsResponseSchema,
} from './schemas';
import Configs from '../configs/Configs';
import { TransactionType } from '@rosen-chains/abstract-chain';

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
      const results = await dbAction.getCompletedEvents(
        sort,
        fromChain,
        toChain,
        minAmount,
        maxAmount
      );
      const txs = await dbAction.getValidTxs();

      const events = results
        .slice(offset, offset + limit)
        .map((result): EventHistory => {
          const event = result.eventData;
          const token = Configs.tokenMap.search(event.fromChain, {
            [Configs.tokenMap.getIdKey(event.fromChain)]:
              event.sourceChainTokenId,
          });

          let name = 'Unsupported token';
          let decimals = 0;
          let isNativeToken = false;

          if (token.length) {
            name = token[0][event.fromChain].name;
            decimals = token[0][event.fromChain].decimals;
            isNativeToken =
              token[0][event.fromChain].metaData.type === 'native';
          }

          const tokenData: TokenData = {
            tokenId: event.sourceChainTokenId,
            amount: Number(event.amount),
            name: name ?? 'Unsupported token',
            decimals: decimals ?? 0,
            isNativeToken: isNativeToken,
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
            paymentTxId:
              txs.find(
                (tx) =>
                  tx.event.id === event.eventId &&
                  tx.type === TransactionType.payment
              )?.txId ?? '',
            rewardTxId:
              txs.find(
                (tx) =>
                  tx.event.id === event.eventId &&
                  tx.type === TransactionType.reward
              )?.txId ?? '',
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
          200: OngoingEventsResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sort, offset, limit, fromChain, toChain, maxAmount, minAmount } =
        request.query;

      const dbAction = DatabaseAction.getInstance();
      const results = await dbAction.getOngoingEvents(
        sort,
        fromChain,
        toChain,
        minAmount,
        maxAmount
      );

      const txs = await dbAction.getValidTxs();

      const events = results
        .slice(offset, offset + limit)
        .map((result): OngoingEvents => {
          const event = result.eventData;
          const token = Configs.tokenMap.search(event.fromChain, {
            [Configs.tokenMap.getIdKey(event.fromChain)]:
              event.sourceChainTokenId,
          });

          let name = 'Unsupported token';
          let decimals = 0;
          let isNativeToken = false;

          if (token.length) {
            name = token[0][event.fromChain].name;
            decimals = token[0][event.fromChain].decimals;
            isNativeToken =
              token[0][event.fromChain].metaData.type === 'native';
          }

          const tokenData: TokenData = {
            tokenId: event.sourceChainTokenId,
            amount: Number(event.amount),
            name: name ?? 'Unsupported token',
            decimals: decimals ?? 0,
            isNativeToken: isNativeToken,
          };

          let status = '';
          switch (result.status) {
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
              status = result.status;
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
