import { apiCallBack } from '../communication/CallbackUtils';
import Dialer from '../communication/Dialer';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';
import { Type } from '@sinclair/typebox';
import { FastifySeverInstance } from './types';

const logger = loggerFactory(import.meta.url);

const messageResponse = Type.Object({
  message: Type.String(),
});

const sendRoute = (server: FastifySeverInstance, dialer: Dialer) => {
  const body = Type.Object({
    channel: Type.String({ maxLength: Configs.MAX_LENGTH_CHANNEL_SIZE }),
    message: Type.String(),
    receiver: Type.Optional(Type.String()),
  });
  server.post(
    '/send',
    {
      schema: {
        body: body,
        response: {
          200: messageResponse,
        },
      },
    },
    (request, reply) => {
      const { channel, message, receiver } = request.body;
      if (receiver) {
        dialer.sendMessage(channel, message, receiver);
      } else {
        dialer.sendMessage(channel, message);
      }
      reply.status(200).send({ message: 'ok' });
    }
  );
};

const subscribeRoute = (server: FastifySeverInstance, dialer: Dialer) => {
  const body = Type.Object({
    channel: Type.String({ maxLength: Configs.MAX_LENGTH_CHANNEL_SIZE }),
    url: Type.Optional(Type.String()),
  });
  server.post(
    '/channel/subscribe',
    {
      schema: {
        body: body,
        response: {
          200: messageResponse,
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

const getPeerIdsRoute = (server: FastifySeverInstance, dialer: Dialer) => {
  const response = Type.Array(Type.String());
  server.get(
    '/getPeerIDs',
    {
      schema: {
        response: {
          200: response,
        },
      },
    },
    (request, reply) => {
      reply.status(200).send(dialer.getPeerIds());
    }
  );
};

const getPeerIdRoute = (server: FastifySeverInstance, dialer: Dialer) => {
  const response = Type.Object({
    peerId: Type.String(),
  });
  server.get(
    '/getPeerID',
    {
      schema: {
        response: {
          200: response,
        },
      },
    },
    (request, reply) => {
      reply.status(200).send({ peerId: dialer.getDialerId() });
    }
  );
};

const p2pRoutes = async (server: FastifySeverInstance) => {
  const dialer = await Dialer.getInstance();
  sendRoute(server, dialer);
  subscribeRoute(server, dialer);
  getPeerIdsRoute(server, dialer);
  getPeerIdRoute(server, dialer);
};

export { p2pRoutes };
