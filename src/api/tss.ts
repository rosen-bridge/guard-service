import CardanoChain from '../chains/cardano/CardanoChain';
import { loggerFactory } from '../log/Logger';
import { FastifySeverInstance, messageResponse } from './types';
import { Type } from '@sinclair/typebox';

const logger = loggerFactory(import.meta.url);

const signRoute = (server: FastifySeverInstance) => {
  const body = Type.Object({
    message: Type.Any(),
    status: Type.String(),
  });
  server.post(
    '/tss/sign',
    {
      schema: {
        body: body,
        response: {
          200: messageResponse,
          500: messageResponse,
        },
      },
    },
    (request, reply) => {
      const req = request.body;
      const message = JSON.stringify(req.message);
      const status = req.status;
      const cardanoChain = new CardanoChain();
      cardanoChain
        .signTransaction(message, status)
        .then(() => {
          reply.status(200).send({ message: 'ok' });
        })
        .catch((error) => {
          logger.error(
            `An error occurred while processing TSS Cardano tx sign callback: ${error}`
          );
          logger.error(error.stack);
          reply.status(500).send({ message: error.message });
        });
    }
  );
};

const tssRoute = async (server: FastifySeverInstance) => {
  signRoute(server);
};

export { tssRoute };
