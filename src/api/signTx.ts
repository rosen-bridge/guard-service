import {
  FastifySeverInstance,
  MessageResponseSchema,
  SignQuerySchema,
} from './schemas';
import Configs from '../configs/Configs';
import ChainHandler from '../handlers/ChainHandler';
import DatabaseHandler from '../db/DatabaseHandler';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

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
        const tx = await ChainHandler.getInstance()
          .getChain(chain)
          .rawTxToPaymentTransaction(txJson);

        await DatabaseHandler.insertTx(tx);
        reply.status(200).send({
          message: 'Ok',
        });
      } catch (e) {
        logger.warn(`Failed to insert manual tx into database for sign: ${e}`);
        reply.status(400).send({
          message: `Request failed: ${e}`,
        });
      }
    }
  );
};

const signRoute = async (server: FastifySeverInstance) => {
  signTxRoute(server);
};

export { signRoute };
