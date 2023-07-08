import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

type FastifySeverInstance = FastifyInstance<
  Server<any, any>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

enum SortRequest {
  ASC = 'ASC',
  DESC = 'DESC',
}

type Asset = {
  tokenId: string;
  tokenName: string;
  amount: string;
};

export { FastifySeverInstance, SortRequest, Asset };
