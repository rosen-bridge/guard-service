import { HealthCheck } from '@rosen-bridge/health-check';
import { getHealthCheck } from '../guard/HealthCheck';
import Configs from '../configs/Configs';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

const healthCheckUpdateJob = async (healthCheck: HealthCheck) => {
  logger.debug(`Updating health status`);
  try {
    await Promise.race([
      healthCheck.update(),
      new Promise((resolve, reject) =>
        setTimeout(
          () => reject('job timed out'),
          Configs.healthCheckTimeout * 1000
        )
      ),
    ]);
  } catch (e) {
    if (e instanceof AggregateError) {
      logger.warn(
        `Health check update job failed: ${e.errors.map(
          (error) => error.message
        )}`
      );
    } else logger.warn(`Health check update job failed: ${e}`);
  }
  logger.debug('Checking p2p connection status');

  setTimeout(
    () => healthCheckUpdateJob(healthCheck),
    Configs.healthUpdateInterval * 1000
  );
};

const healthCheckStart = async () => {
  const healthCheck = await getHealthCheck();
  healthCheckUpdateJob(healthCheck);
};

export { healthCheckStart };
