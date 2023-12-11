import {
  FastifySeverInstance,
  MessageResponseSchema,
  SignQuerySchema,
} from './schemas';
import Configs from '../configs/Configs';
import ChainHandler from '../handlers/ChainHandler';
import DatabaseHandler from '../db/DatabaseHandler';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { DuplicateTransaction } from '../utils/errors';

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
      const { chain, txJson, requiredSign, overwrite } = request.body;
      if (!Configs.isManualTxRequestActive)
        reply.status(400).send({
          message: `Manual transaction request is disabled in config`,
        });

      try {
        const tx = await ChainHandler.getInstance()
          .getChain(chain)
          .rawTxToPaymentTransaction(txJson);

        await DatabaseHandler.insertTx(tx, requiredSign, overwrite);
        reply.status(200).send({
          message: 'Ok',
        });
      } catch (e) {
        if (e instanceof DuplicateTransaction) {
          logger.warn(`Failed to insert manual tx due to duplication: ${e}`);
          reply.status(409).send({
            message: `Tx is already in database`,
          });
        } else {
          logger.warn(
            `Failed to insert manual tx into database for sign: ${e}`
          );
          logger.debug(`Requested tx: ${txJson}`);
          reply.status(400).send({
            message: `Request failed: ${e}`,
          });
        }
      }
    }
  );
};

const signRoute = async (server: FastifySeverInstance) => {
  signTxRoute(server);
};

export { signRoute };
