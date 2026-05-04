import fastifyCors, { FastifyCorsOptions } from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  makeFastify,
  FastifyWithZod,
  FastifyRequest,
} from '@rosen-bridge/fastify-enhanced';

import { arbitraryOrderRoute } from '../api/arbitrary';
import { balanceRoutes } from '../api/balance';
import { eventRoutes } from '../api/events';
import { generalInfoRoute } from '../api/generalInfo';
import { healthRoutes } from '../api/healthCheck';
import { p2pRoutes } from '../api/p2p';
import { eventReprocessRoute } from '../api/reprocess';
import { revenueRoutes } from '../api/revenue';
import { signRoute } from '../api/signTx';
import { tssRoute } from '../api/tss';
import Configs from '../configs/configs';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * initialize api server
 * setup swagger on it
 * register all routers
 * then start it
 */
let apiServer: FastifyWithZod;
const initApiServer = async () => {
  apiServer = await makeFastify(
    {
      path: '/swagger',
      title: 'api',
      description: '',
      version: '0.0.1',
      enableCSP: true,
    },
    {
      bodyLimit: Configs.apiBodyLimit,
    },
  );

  if (Configs.apiAllowedOrigins.includes('*')) {
    await apiServer.register(fastifyCors, {});
  } else {
    await apiServer.register(fastifyCors, () => {
      return (
        req: FastifyRequest,
        callback: (
          error: Error | null,
          corsOptions?: FastifyCorsOptions,
        ) => void,
      ) => {
        if (
          req.headers.origin &&
          Configs.apiAllowedOrigins.filter((item) =>
            req.headers.origin?.includes(item),
          ).length > 0
        ) {
          callback(null, { origin: true });
        }
        callback(null, { origin: false });
      };
    });
  }

  await apiServer.register(rateLimit, {
    max: Configs.apiMaxRequestsPerMinute,
    timeWindow: '1 minute',
  });

  await apiServer.register(p2pRoutes);
  await apiServer.register(tssRoute);
  await apiServer.register(generalInfoRoute);
  await apiServer.register(eventRoutes);
  await apiServer.register(healthRoutes);
  await apiServer.register(revenueRoutes);
  await apiServer.register(signRoute);
  await apiServer.register(arbitraryOrderRoute);
  await apiServer.register(eventReprocessRoute);
  await apiServer.register(balanceRoutes);

  apiServer.get('/', (request, reply) => {
    reply.redirect('/swagger');
  });
  const port = Configs.apiPort;
  const host = Configs.apiHost;

  await apiServer.listen({ host, port });
  logger.info(`api service started at http://${host}:${port}`);
};

export { initApiServer, apiServer };
