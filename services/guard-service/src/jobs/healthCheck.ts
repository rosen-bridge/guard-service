import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { HealthCheck } from '@rosen-bridge/health-check';

import Configs from '../configs/configs';
import { getHealthCheck } from '../guard/healthCheck';

const logger = DefaultLogger.getInstance().child(import.meta.url);

const healthCheckUpdateJob = async (healthCheck: HealthCheck) => {
  logger.debug(`Updating health status`);
  try {
    await Promise.race([
      healthCheck.update(),
      new Promise((resolve, reject) =>
        setTimeout(
          () => reject('job timed out'),
          Configs.healthCheckTimeout * 1000,
        ),
      ),
    ]);
  } catch (e) {
    if (e instanceof AggregateError) {
      logger.warn(
        `Health check update job failed: ${e.errors.map(
          (error) => error.message,
        )}`,
      );
    } else logger.warn(`Health check update job failed: ${e}`);
  }

  setTimeout(
    () => healthCheckUpdateJob(healthCheck),
    Configs.healthUpdateInterval * 1000,
  );
};

const healthCheckStart = async () => {
  const healthCheck = await getHealthCheck();
  healthCheckUpdateJob(healthCheck);
};

export { healthCheckStart };
