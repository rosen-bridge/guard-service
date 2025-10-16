import {
  FastifySeverInstance,
  MessageResponseSchema,
  ReprocessQuerySchema,
} from './schemas';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { authenticateKey } from '../utils/authentication';
import { NotFoundError } from '@rosen-chains/abstract-chain';
import EventReprocess from '../reprocess/eventReprocess';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * setup event reprocess route
 * @param server
 */
const reprocessRoute = (server: FastifySeverInstance) => {
  server.post(
    '/reprocess',
    {
      schema: {
        body: ReprocessQuerySchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
          403: MessageResponseSchema,
          404: MessageResponseSchema,
        },
        security: [{ apiKey: [] }],
      },
      preHandler: [authenticateKey],
    },
    async (request, reply) => {
      const { eventId, peerIds } = request.body;
      try {
        await EventReprocess.getInstance().sendReprocessRequest(
          eventId,
          peerIds,
        );
        reply.status(200).send({
          message: 'Ok',
        });
      } catch (e) {
        if (e instanceof NotFoundError) {
          reply.status(404).send({
            message: e.message,
          });
        } else {
          logger.warn(
            `Failed to send reprocess request for event [${eventId}] to peers [${peerIds.join(
              ',',
            )}]: ${e}`,
          );
          reply.status(400).send({
            message: `Request failed: ${e}`,
          });
        }
      }
    },
  );
};

const eventReprocessRoute = async (server: FastifySeverInstance) => {
  reprocessRoute(server);
};

export { eventReprocessRoute };
