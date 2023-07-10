import fastify, { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { p2pRoutes } from '../api/p2p';
import Configs from '../configs/Configs';
import { loggerFactory } from '../log/Logger';
import { generalInfoRoute } from '../api/generalInfo';
import { eventRoutes } from '../api/events';
import { revenueRoutes } from '../api/revenue';
import { healthRoutes } from '../api/healthCheck';
import { tssRoute } from '../api/tss';

const logger = loggerFactory(import.meta.url);

/**
 * initialize api server
 * setup swagger on it
 * register all routers
 * then start it
 */
let apiServer: FastifyInstance;
const initApiServer = async () => {
  apiServer = fastify({
    bodyLimit: Configs.apiBodyLimit,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await apiServer.register(swagger);

  await apiServer.register(swaggerUi, {
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

  await apiServer.register(p2pRoutes);
  await apiServer.register(tssRoute);
  await apiServer.register(generalInfoRoute);
  await apiServer.register(eventRoutes);
  await apiServer.register(revenueRoutes);
  await apiServer.register(healthRoutes);

  apiServer.get('/', (request, reply) => {
    reply.redirect('/swagger');
  });
  const port = Configs.apiPort;
  const host = Configs.apiHost;

  await apiServer.listen({ host, port });
  logger.info(`api service started at http://${host}:${port}`);
};

export { initApiServer, apiServer };
