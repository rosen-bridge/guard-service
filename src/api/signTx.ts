import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

import Configs from '../configs/configs';
import DatabaseHandler from '../db/databaseHandler';
import ChainHandler from '../handlers/chainHandler';
import GuardPkHandler from '../handlers/guardPkHandler';
import { authenticateKey } from '../utils/authentication';
import { DuplicateTransaction } from '../utils/errors';
import {
  FastifySeverInstance,
  MessageResponseSchema,
  SignQuerySchema,
} from './schemas';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * setup sign transaction route
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
          403: MessageResponseSchema,
          409: MessageResponseSchema,
        },
        security: [{ apiKey: [] }],
      },
      preHandler: [authenticateKey],
    },
    async (request, reply) => {
      const { chain, txJson, requiredSign, overwrite } = request.body;
      if (!Configs.isManualTxRequestActive) {
        reply.status(400).send({
          message: `Manual transaction request is disabled in config`,
        });
        return;
      }

      const guardsLen = GuardPkHandler.getInstance().guardsLen;
      if (requiredSign > guardsLen || requiredSign <= 0) {
        reply.status(400).send({
          message: `Invalid value for required sign (expected 1 to ${guardsLen}, found ${requiredSign})`,
        });
        return;
      }

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
            `Failed to insert manual tx into database for sign: ${e}`,
          );
          logger.debug(`Requested tx: ${txJson}`);
          reply.status(400).send({
            message: `Request failed: ${e}`,
          });
        }
      }
    },
  );
};

const signRoute = async (server: FastifySeverInstance) => {
  signTxRoute(server);
};

export { signRoute };
