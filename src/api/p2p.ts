import { apiCallBack } from '../communication/CallbackUtils';
import Configs from '../configs/Configs';
import { Type } from '@sinclair/typebox';
import { FastifySeverInstance, MessageResponseSchema } from './schemas';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import RosenDialer from '../communication/RosenDialer';
import { RosenDialerNode } from '@rosen-bridge/dialer';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * setup route for send p2p message
 * @param server
 * @param dialer
 */
const sendRoute = (server: FastifySeverInstance, dialer: RosenDialerNode) => {
  const bodySchema = Type.Object({
    channel: Type.String({ maxLength: Configs.MAX_LENGTH_CHANNEL_SIZE }),
    message: Type.String(),
    receiver: Type.Optional(Type.String()),
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
        .then((res) => {
          reply.status(200).send({ message: 'ok' });
        })
        .catch((err) => {
          logger.error(err);
          reply.status(500).send({ message: err });
        });
    }
  );
};

/**
 * setup route for subscribe channel
 * @param server
 * @param dialer
 */
const subscribeRoute = (
  server: FastifySeverInstance,
  dialer: RosenDialerNode
) => {
  const bodySchema = Type.Object({
    channel: Type.String({ maxLength: Configs.MAX_LENGTH_CHANNEL_SIZE }),
    url: Type.String(),
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
    }
  );
};

/**
 * setup route for get my peer id
 * @param server
 * @param dialer
 */
const getPeerIdRoute = (
  server: FastifySeverInstance,
  dialer: RosenDialerNode
) => {
  const responseSchema = Type.Object({
    message: Type.String(),
    status: Type.String(),
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
    }
  );
};

/**
 * plugin to setup p2p routes
 * @param server
 */
const p2pRoutes = async (server: FastifySeverInstance) => {
  const dialer = await RosenDialer.getInstance();
  sendRoute(server, dialer);
  subscribeRoute(server, dialer);
  getPeerIdRoute(server, dialer);
};

export { p2pRoutes };
