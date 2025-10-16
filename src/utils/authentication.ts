import { blake2b } from 'blakejs';
import Configs from '../configs/configs';
import { FastifyReply, FastifyRequest } from 'fastify';
import { HookHandlerDoneFunction } from 'fastify/types/hooks';
import { toString as uint8ArrayToString } from 'uint8arrays';

const authenticateKey = <T extends FastifyRequest, U extends FastifyReply>(
  req: T,
  res: U,
  next: HookHandlerDoneFunction,
) => {
  const api_key: string = req.headers['api-key'] as string;
  if (api_key && isValidApiKey(api_key)) {
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

export { authenticateKey };
