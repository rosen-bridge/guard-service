import { Type } from '@sinclair/typebox';
import { FastifySeverInstance, HealthStatusType } from '../types/api';
import { messageResponseSchema } from '../types/schema';
import { getHealthCheck } from '../guard/HealthCheck';

/**
 * setup health status route
 * @param server
 */
const healthStatusRoute = (server: FastifySeverInstance) => {
  server.get(
    '/health/status',
    {
      schema: {
        response: {
          200: Type.Array(HealthStatusType),
          500: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await (
        await (await getHealthCheck()).getHealthStatus()
      ).map((status) => ({
        ...status,
        lastCheck: status.lastCheck?.toISOString(),
      }));
      reply.status(200).send(result);
    }
  );
};

/**
 * setup parameter health status route
 * @param server
 */
const healthStatusForParameterRoute = (server: FastifySeverInstance) => {
  server.get(
    '/health/parameter/:paramName',
    {
      schema: {
        params: Type.Object({ paramName: Type.String() }),
        response: {
          200: HealthStatusType,
          500: messageResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const health = await getHealthCheck();
      const status = await health.getHealthStatusFor(request.params.paramName);
      reply
        .status(200)
        .send({ ...status!, lastCheck: status?.lastCheck?.toISOString() });
    }
  );
};

/**
 * setup update parameter health status route
 * @param server
 */
const UpdateHealthStatusForParameterRoute = (server: FastifySeverInstance) => {
  server.put(
    '/health/parameter/:paramName',
    {
      schema: {
        params: Type.Object({ paramName: Type.String() }),
        response: {
          200: HealthStatusType,
          500: messageResponseSchema,
        },
      },
    },

    async (request, reply) => {
      const health = await getHealthCheck();
      await health.updateParam(request.params.paramName);
      const status = await health.getHealthStatusFor(request.params.paramName);
      reply
        .status(200)
        .send({ ...status!, lastCheck: status?.lastCheck?.toISOString() });
    }
  );
};

const healthRoutes = async (server: FastifySeverInstance) => {
  healthStatusRoute(server);
  healthStatusForParameterRoute(server);
  UpdateHealthStatusForParameterRoute(server);
};

export { healthRoutes };
