import Tss from '../guard/Tss';
import {
  FastifySeverInstance,
  MessageResponseSchema,
  TssCallbackSchema,
} from './schemas';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

/**
 * setups TSS curve (ECDSA) sign route
 * @param server
 */
const curveSignRoute = (server: FastifySeverInstance) => {
  const bodySchema = TssCallbackSchema;
  server.post(
    '/tss/sign/curve',
    {
      schema: {
        body: bodySchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { status, error, message, signature, signatureRecovery } =
          request.body;
        await Tss.getInstance().handleSignData(
          false, // not EdDSA
          status,
          error,
          message,
          signature,
          signatureRecovery
        );
        reply.send({ message: 'ok' });
      } catch (error) {
        logger.warn(
          `An error occurred while processing TSS curve tx sign callback: ${error}`
        );
        logger.warn(error.stack);
        reply.status(400).send({ message: error.message });
      }
    }
  );
};

/**
 * setups TSS edward (EdDSA) sign route
 * @param server
 */
const edwardSignRoute = (server: FastifySeverInstance) => {
  const bodySchema = TssCallbackSchema;
  server.post(
    '/tss/sign/edward',
    {
      schema: {
        body: bodySchema,
        response: {
          200: MessageResponseSchema,
          400: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { status, error, message, signature, signatureRecovery } =
          request.body;
        await Tss.getInstance().handleSignData(
          true, // is EdDSA
          status,
          error,
          message,
          signature,
          signatureRecovery
        );
        reply.send({ message: 'ok' });
      } catch (error) {
        logger.warn(
          `An error occurred while processing TSS edward tx sign callback: ${error}`
        );
        logger.warn(error.stack);
        reply.status(400).send({ message: error.message });
      }
    }
  );
};

const tssRoute = async (server: FastifySeverInstance) => {
  curveSignRoute(server);
  edwardSignRoute(server);
};

export { tssRoute };
