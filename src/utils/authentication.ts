import { blake2b } from 'blakejs';
import Configs from '../configs/Configs';
import { FastifyReply, FastifyRequest } from 'fastify';
import { HookHandlerDoneFunction } from 'fastify/types/hooks';
import { toString as uint8ArrayToString } from 'uint8arrays';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

const authenticateKey = <T extends FastifyRequest, U extends FastifyReply>(
  req: T,
  res: U,
  next: HookHandlerDoneFunction
) => {
  const api_key: string = req.headers['api-key'] as string;
  logger.info(`headers are ${JSON.stringify(req.headers)}`);
  logger.info(`header api-key is ${api_key}`);
  const valid = isValidApiKey(api_key);
  logger.info(`isValidApiKey ${valid}`);
  logger.info(`condition ${api_key && valid}`);
  if (api_key && valid) {
    next();
  } else {
    res.status(403).send({ message: "Api-Key doesn't exist or it's wrong" });
  }
};

/**
 * check api_key according to old method (pure hash) and salted hash
 * @param api_key
 */
const isValidApiKey = (api_key: string) => {
  const isSaltedHash = Configs.apiKeyHash.includes('$');
  logger.info(`isSaltedHash ${isSaltedHash}`);
  logger.info(`apiKeyHash ${Configs.apiKeyHash}`);
  let isValidHash: boolean;
  if (isSaltedHash) {
    const splitSaltedHash = Configs.apiKeyHash.split('$');
    logger.info(`splitSaltedHash ${splitSaltedHash}`);
    const saltedPass = Buffer.concat([
      Buffer.from(splitSaltedHash.at(1)!, 'base64'),
      Buffer.from(api_key),
    ]);
    logger.info(`saltedPass ${saltedPass.toString('hex')}`);
    logger.info(
      `hash ${uint8ArrayToString(
        blake2b(saltedPass, undefined, 32),
        'base64pad'
      )}`
    );
    logger.info(`splitSaltedHash2, ${splitSaltedHash.at(2)}`);
    isValidHash =
      uint8ArrayToString(blake2b(saltedPass, undefined, 32), 'base64pad') ===
      splitSaltedHash.at(2);
  } else {
    logger.info(
      `without salt ${uint8ArrayToString(
        blake2b(api_key, undefined, 32),
        'hex'
      )}`
    );
    isValidHash =
      uint8ArrayToString(blake2b(api_key, undefined, 32), 'hex') ===
      Configs.apiKeyHash;
  }
  return isValidHash;
};

export { authenticateKey };
