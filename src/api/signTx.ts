import { EventHistory, OngoingEvents, TokenData } from '../types/api';
import { EventStatus } from '../utils/constants';
import { DatabaseAction } from '../db/DatabaseAction';
import {
  EventsQuerySchema,
  EventsHistoryResponseSchema,
  FastifySeverInstance,
  MessageResponseSchema,
  OngoingEventsResponseSchema,
  SignQuerySchema,
} from './schemas';
import Configs from '../configs/Configs';
import { TransactionType } from '@rosen-chains/abstract-chain';

/**
 * setup event history route
 * @param server
 */
const signTxRoute = (server: FastifySeverInstance) => {
  server.post(
    '/sign',
    {
      schema: {
        body: SignQuerySchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { chain, txJson } = request.body;
      if (!Configs.isSignRouteActive)
        reply.status(400).send({
          message: `Sign route is disabled`,
        });

      try {
        reply.status(200).send({
          message: 'Ok',
        });
      } catch (e) {
        reply.status(400).send({
          message: ``,
        });
      }
    }
  );
};

const signRoutes = async (server: FastifySeverInstance) => {
  signTxRoute(server);
};

export { signRoutes };
