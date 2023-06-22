import fastify from 'fastify';
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
const initApiServer = async () => {
  const server = fastify({
    bodyLimit: Configs.apiBodyLimit,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await server.register(swagger);

  await server.register(swaggerUi, {
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

  await server.register(p2pRoutes);
  await server.register(tssRoute);
  await server.register(generalInfoRoute);
  server.get('/', (request, reply) => {
    reply.redirect('/swagger');
  });
  const port = Configs.apiPort;
  const host = Configs.apiHost;

  await server.listen({ host, port });
  logger.info(`api service started at http://${host}:${port}`);
};

export { initApiServer };
