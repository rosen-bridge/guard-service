import { blake2b } from 'blakejs';
import { toString as uint8ArrayToString } from 'uint8arrays';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from '@rosen-bridge/fastify-enhanced';

import Configs from '../configs/configs';
import TssHandler from '../handlers/tssHandler';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * validates api-key header for authentication
 * @param request
 * @param replay
 * @param next
 */
export const authenticateKey = <
  T extends FastifyRequest,
  U extends FastifyReply,
>(
  request: T,
  replay: U,
  next: HookHandlerDoneFunction,
) => {
  const api_key: string = request.headers['api-key'] as string;
  if (api_key && isValidApiKey(api_key)) {
    next();
  } else {
    replay.status(403).send({ message: "Api-Key doesn't exist or it's wrong" });
  }
};

/**
 * checks api_key according to old method (pure hash) and salted hash
 * @param api_key
 */
const isValidApiKey = (api_key: string) => {
  const isSaltedHash = Configs.apiKeyHash.includes('$');
  let isValidHash: boolean;
  if (isSaltedHash) {
    const splitSaltedHash = Configs.apiKeyHash.split('$');
    const saltedPass = Buffer.concat([
      Buffer.from(splitSaltedHash.at(1)!, 'base64'),
      Buffer.from(api_key),
    ]);
    isValidHash =
      uint8ArrayToString(blake2b(saltedPass, undefined, 32), 'base64pad') ===
      splitSaltedHash.at(2);
  } else {
    isValidHash =
      uint8ArrayToString(blake2b(api_key, undefined, 32), 'hex') ===
      Configs.apiKeyHash;
  }
  return isValidHash;
};

/**
 * validates trust key provided in the body of request with TssHandler trust key
 * @param request
 * @param replay
 * @param next
 */
export const validateTrustKey = <
  T extends FastifyRequest,
  U extends FastifyReply,
>(
  request: T,
  replay: U,
  next: HookHandlerDoneFunction,
): void => {
  // TODO: it may be possible to handle the body in Fastify preHandler
  //  and avoid type casting (local:ergo/rosen-bridge/guard-service#563)
  const { trustKey } = request.body as { trustKey: string };
  if (trustKey !== TssHandler.getTrustKey()) {
    logger.warn(
      `Received message with wrong trust key on route [${request.routeOptions.url}]`,
    );
    replay.status(403).send({ message: 'Trust key is wrong' });
    return;
  }
  next();
};
