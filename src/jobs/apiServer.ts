import fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { p2pRoutes } from '../api/p2p';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';
import { tssRoute } from '../api/tss';

const logger = loggerFactory(import.meta.url);

const initApiServer = async () => {
  const server = fastify({
    bodyLimit: Configs.apiBodyLimit,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await server.register(swagger);

  await server.register(swaggerUi, {
    routePrefix: '/documentation',
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
  server.get('/', (request, reply) => {
    reply.redirect('/documentation');
  });
  const port = Configs.apiPort;
  const host = Configs.apiHost;

  await server.listen({ host, port });
  logger.info(`api service started at http://${host}:${port}`);
};

export { initApiServer };
