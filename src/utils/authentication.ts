import { blake2b } from 'blakejs';
import { Buffer } from 'buffer';
import Configs from '../configs/Configs';
import { FastifyReply, FastifyRequest } from 'fastify';
import { HookHandlerDoneFunction } from 'fastify/types/hooks';

const authenticateKey = <T extends FastifyRequest, U extends FastifyReply>(
  req: T,
  res: U,
  next: HookHandlerDoneFunction
) => {
  const api_key: string = req.headers['api-key'] as string;
  if (
    api_key &&
    Buffer.from(blake2b(api_key, undefined, 32)).toString('hex') ==
      Configs.apiKeyHash
  ) {
    next();
  } else {
    res.status(403).send({ message: "Api-Key doesn't exist or it's wrong" });
  }
};

export { authenticateKey };
