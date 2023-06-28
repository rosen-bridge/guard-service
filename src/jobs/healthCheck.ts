import { loggerFactory } from '../log/Logger';
import { HealthCheck } from '@rosen-bridge/health-check';
import { getHealthCheck } from '../guard/HealthCheck';
import Configs from '../helpers/Configs';

const logger = loggerFactory(import.meta.url);

const healthCheckUpdateJob = async (healthCheck: HealthCheck) => {
  try {
    await healthCheck.update();
  } catch (e) {
    logger.warn(
      `Health check update job failed for , ${e.message}, ${e.stack}`
    );
  }
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