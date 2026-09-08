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
 * generates a Fastify preHandler that validates the `api-key` header against
 * a predicate, replying with 403 and logging when it doesn't hold
 * @param isValid predicate the header value must satisfy
 * @param errorMessage message sent back (and logged) when validation fails
 * @returns a preHandler enforcing the given predicate on the `api-key` header
 */
const generateApiKeyValidator = <
  T extends FastifyRequest,
  U extends FastifyReply,
>(
  isValid: (key: string) => boolean,
  errorMessage: string,
) => {
  return (request: T, replay: U, next: HookHandlerDoneFunction): void => {
    const key = request.headers['api-key'] as string;
    if (key && isValid(key)) {
      next();
    } else {
      logger.warn(`${errorMessage} on route [${request.routeOptions.url}]`);
      replay.status(403).send({ message: errorMessage });
    }
  };
};

type ApiPreHandler = <T extends FastifyRequest, U extends FastifyReply>(
  request: T,
  response: U,
  next: HookHandlerDoneFunction,
) => void;

/**
 * validates api-key header for authentication
 */
export const authenticateKey: ApiPreHandler = generateApiKeyValidator(
  isValidApiKey,
  "Api-Key doesn't exist or it's wrong",
);

/**
 * validates api-key header against TssHandler's TSS API key, for routes only
 * meant to be called back by the local tss/dialer processes
 */
export const authenticateTssApiKey: ApiPreHandler = generateApiKeyValidator(
  (key) => key === TssHandler.getTssApiKey(),
  "Tss Api-Key doesn't exist or it's wrong",
);
