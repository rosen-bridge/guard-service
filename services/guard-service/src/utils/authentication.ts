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
 * validates the `api-key` header against a predicate, replying with 403 and
 * logging when it doesn't hold
 * @param request
 * @param replay
 * @param next
 * @param isValid predicate the header value must satisfy
 * @param errorMessage message sent back (and logged) when validation fails
 */
const validateKeyHeader = (
  request: FastifyRequest,
  replay: FastifyReply,
  next: HookHandlerDoneFunction,
  isValid: (key: string) => boolean,
  errorMessage: string,
): void => {
  const key = request.headers['api-key'] as string;
  if (key && isValid(key)) {
    next();
  } else {
    logger.warn(`${errorMessage} on route [${request.routeOptions.url}]`);
    replay.status(403).send({ message: errorMessage });
  }
};

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
): void =>
  validateKeyHeader(
    request,
    replay,
    next,
    isValidApiKey,
    "Api-Key doesn't exist or it's wrong",
  );

/**
 * validates api-key header against Tss Api-Key, for routes only
 * meant to be called back by the local tss/dialer processes
 * @param request
 * @param replay
 * @param next
 */
export const authenticateTssApiKey = <
  T extends FastifyRequest,
  U extends FastifyReply,
>(
  request: T,
  replay: U,
  next: HookHandlerDoneFunction,
): void =>
  validateKeyHeader(
    request,
    replay,
    next,
    (key) => key === TssHandler.getTssApiKey(),
    'Tss Api-Key is wrong',
  );
