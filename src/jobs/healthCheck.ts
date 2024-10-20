import { HealthCheck, HealthStatusLevel } from '@rosen-bridge/health-check';
import { getHealthCheck } from '../guard/HealthCheck';
import Configs from '../configs/Configs';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { exit } from 'process';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);
let lastP2pUp = Date.now();

const healthCheckUpdateJob = async (healthCheck: HealthCheck) => {
  try {
    await healthCheck.update();
    // TODO: remove this part after fixing p2p problem
    //  local:ergo/rosen-bridge/p2p#11
    if (Configs.p2pBrokenTimeAllowed !== 0) {
      const status = await healthCheck.getHealthStatusWithParamId(
        'P2P Network'
      );
      if (status?.status === HealthStatusLevel.BROKEN) {
        const diff = Date.now() - lastP2pUp;
        if (diff > Configs.p2pBrokenTimeAllowed) {
          logger.error(
            `Service exited during broken p2p for ${Configs.p2pBrokenTimeAllowed} seconds`
          );
          exit(1);
        }
      } else {
        lastP2pUp = Date.now();
      }
    }
  } catch (e) {
    if (e instanceof AggregateError) {
      logger.warn(
        `Health check update job failed: ${e.errors.map(
          (error) => error.message
        )}`
      );
    } else logger.warn(`Health check update job failed: ${e.message}`);
    logger.warn(e.stack);
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
