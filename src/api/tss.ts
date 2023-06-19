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
    '/sign',
    {
      schema: {
        body: body,
        response: {
          200: messageResponse,
          500: messageResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const req = request.body;
        const message = JSON.stringify(req.message);
        const status = req.status;
        const cardanoChain = new CardanoChain();
        await cardanoChain.signTransaction(message, status);
        reply.status(200).send({ message: 'ok' });
      } catch (error) {
        logger.error(
          `An error occurred while processing TSS Cardano tx sign callback: ${error}`
        );
        logger.error(error.stack);
        reply.status(500).send({ message: error.message });
      }
    }
  );
};

const tssRoute = (server: FastifySeverInstance) => {
  signRoute(server);
};

export { tssRoute };
