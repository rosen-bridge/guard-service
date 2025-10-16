import {
  FastifySeverInstance,
  MessageResponseSchema,
  OrderQuerySchema,
} from './schemas';
import Configs from '../configs/configs';
import DatabaseHandler from '../db/databaseHandler';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { DuplicateOrder } from '../utils/errors';
import { authenticateKey } from '../utils/authentication';
import { SUPPORTED_CHAINS } from '../utils/constants';
import { ChainUtils } from '@rosen-chains/abstract-chain';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * setup arbitrary order route
 * @param server
 */
const orderRoute = (server: FastifySeverInstance) => {
  server.post(
    '/order',
    {
      schema: {
        body: OrderQuerySchema,
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
      const { id, chain, orderJson } = request.body;
      if (!Configs.isArbitraryOrderRequestActive) {
        reply.status(400).send({
          message: `Arbitrary order request is disabled in config`,
        });
        return;
      }

      if (!SUPPORTED_CHAINS.includes(chain)) {
        reply.status(400).send({
          message: `Invalid value for chain (chain [${chain}] is not supported)`,
        });
        return;
      }

      // id should be a 32bytes hex string
      if (id.length !== 64 || !id.match(/^[0-9a-f]+$/)) {
        reply.status(400).send({
          message: `Invalid value for id (expected 32Bytes hex string, found [${id}])`,
        });
        return;
      }

      try {
        // try to decode order
        const order = ChainUtils.decodeOrder(orderJson);

        await DatabaseHandler.insertOrder(
          id,
          chain,
          ChainUtils.encodeOrder(order),
        );
        reply.status(200).send({
          message: 'Ok',
        });
      } catch (e) {
        if (e instanceof DuplicateOrder) {
          logger.warn(
            `Failed to insert arbitrary order due to duplication: ${e}`,
          );
          reply.status(409).send({
            message: `Order is already in database`,
          });
        } else {
          logger.warn(`Failed to insert arbitrary order into database: ${e}`);
          logger.debug(`Requested order: ${orderJson}`);
          reply.status(400).send({
            message: `Request failed: ${e}`,
          });
        }
      }
    },
  );
};

const arbitraryOrderRoute = async (server: FastifySeverInstance) => {
  orderRoute(server);
};

export { arbitraryOrderRoute };
