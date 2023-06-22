import fastify, { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { p2pRoutes } from '../api/p2p';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';
import { tssRoute } from '../api/tss';
import { generalInfoRoute } from '../api/generalInfo';

const logger = loggerFactory(import.meta.url);

/**
 * initialize api server
 * setup swagger on it
 * register all routers
 * then start it
 */
let fastifyServer: FastifyInstance;
const initApiServer = async () => {
  fastifyServer = fastify({
    bodyLimit: Configs.apiBodyLimit,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastifyServer.register(swagger);

  await fastifyServer.register(swaggerUi, {
    routePrefix: '/swagger',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  await fastifyServer.register(p2pRoutes);
  await fastifyServer.register(tssRoute);
  await fastifyServer.register(generalInfoRoute);
  fastifyServer.get('/', (request, reply) => {
    reply.redirect('/swagger');
  });
  const port = Configs.apiPort;
  const host = Configs.apiHost;

  await fastifyServer.listen({ host, port });
  logger.info(`api service started at http://${host}:${port}`);
};

export { initApiServer, fastifyServer };
