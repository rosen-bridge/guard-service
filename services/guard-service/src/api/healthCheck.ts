import z from 'zod';

import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { getHealthCheck } from '../guard/healthCheck';
import { HealthStatusTypeSchema, MessageResponseSchema } from './schemas';

/**
 * setup health status route
 * @param server
 */
const healthStatusRoute = (server: FastifyWithZod) => {
  server.get(
    '/health/status',
    {
      schema: {
        response: {
          200: z.array(HealthStatusTypeSchema),
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const health = await getHealthCheck();
      const result = (await health.getHealthStatus()).map((status) => ({
        ...status,
        lastCheck: status.lastCheck?.toISOString(),
        lastTrialErrorTime: status.lastTrialErrorTime?.toISOString(),
      }));
      reply.status(200).send(result);
    },
  );
};

/**
 * setup parameter health status route
 * @param server
 */
const healthStatusForParameterRoute = (server: FastifyWithZod) => {
  server.get(
    '/health/parameter/:paramId',
    {
      schema: {
        params: z.object({ paramId: z.string() }),
        response: {
          200: HealthStatusTypeSchema,
          500: MessageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const health = await getHealthCheck();
      const status = await health.getHealthStatusWithParamId(
        request.params.paramId,
      );
      if (!status)
        throw new Error(
          `Health parameter with id '${request.params.paramId}' is not registered.`,
        );
      reply.status(200).send({
        ...status,
        lastCheck: status.lastCheck?.toISOString(),
        lastTrialErrorTime: status.lastTrialErrorTime?.toISOString(),
      });
    },
  );
};

/**
 * setup update parameter health status route
 * @param server
 */
const updateHealthStatusForParameterRoute = (server: FastifyWithZod) => {
  server.put(
    '/health/parameter/:paramId',
    {
      schema: {
        params: z.object({ paramId: z.string() }),
        response: {
          200: HealthStatusTypeSchema,
          500: MessageResponseSchema,
        },
      },
    },

    async (request, reply) => {
      const health = await getHealthCheck();
      await health.updateParam(request.params.paramId);
      const status = await health.getHealthStatusWithParamId(
        request.params.paramId,
      );
      if (!status)
        throw new Error(
          `Health parameter with id '${request.params.paramId}' is not registered.`,
        );
      reply.status(200).send({
        ...status,
        lastCheck: status.lastCheck?.toISOString(),
        lastTrialErrorTime: status.lastTrialErrorTime?.toISOString(),
      });
    },
  );
};

const healthRoutes = async (server: FastifyWithZod) => {
  healthStatusRoute(server);
  healthStatusForParameterRoute(server);
  updateHealthStatusForParameterRoute(server);
};

export { healthRoutes };
