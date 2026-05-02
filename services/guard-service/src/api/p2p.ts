import { z } from 'zod';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { RosenDialerNode } from '@rosen-bridge/dialer';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { apiCallBack } from '../communication/callbackUtils';
import RosenDialer from '../communication/rosenDialer';
import Configs from '../configs/configs';
import { MessageResponseSchema } from './schemas';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * setup route for send p2p message
 * @param server
 * @param dialer
 */
const sendRoute = (server: FastifyWithZod, dialer: RosenDialerNode) => {
  const bodySchema = z.object({
    channel: z.string().max(Configs.MAX_LENGTH_CHANNEL_SIZE),
    message: z.string(),
    receiver: z.optional(z.string()),
  });
  server.post(
    '/p2p/send',
    {
      schema: {
        body: bodySchema,
        response: {
          200: MessageResponseSchema,
          500: MessageResponseSchema,
        },
      },
    },
    (request, reply) => {
      const { channel, message, receiver } = request.body;
      dialer
        .sendMessage(channel, message, receiver)
        .then(() => {
          reply.status(200).send({ message: 'ok' });
        })
        .catch((err) => {
          logger.error(err);
          reply.status(500).send({ message: err });
        });
    },
  );
};

/**
 * setup route for subscribe channel
 * @param server
 * @param dialer
 */
const subscribeRoute = (server: FastifyWithZod, dialer: RosenDialerNode) => {
  const bodySchema = z.object({
    channel: z.string().max(Configs.MAX_LENGTH_CHANNEL_SIZE),
    url: z.string(),
  });
  server.post(
    '/p2p/channel/subscribe',
    {
      schema: {
        body: bodySchema,
        response: {
          200: MessageResponseSchema,
        },
      },
    },
    (request, reply) => {
      const { channel, url } = request.body;
      dialer.subscribeChannel(channel, apiCallBack, url);
      reply.status(200).send({ message: 'ok' });
    },
  );
};

/**
 * setup route for get my peer id
 * @param server
 * @param dialer
 */
const getPeerIdRoute = (server: FastifyWithZod, dialer: RosenDialerNode) => {
  const responseSchema = z.object({
    message: z.string(),
    status: z.string(),
  });
  server.get(
    '/p2p/getPeerID',
    {
      schema: {
        response: {
          200: responseSchema,
        },
      },
    },
    (request, reply) => {
      reply.status(200).send({ message: dialer.getDialerId(), status: 'ok' });
    },
  );
};

/**
 * plugin to setup p2p routes
 * @param server
 */
const p2pRoutes = async (server: FastifyWithZod) => {
  const dialer = RosenDialer.getInstance().getDialer();
  sendRoute(server, dialer);
  subscribeRoute(server, dialer);
  getPeerIdRoute(server, dialer);
};

export { p2pRoutes };
