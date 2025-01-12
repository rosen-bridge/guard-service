import { HealthCheck, HealthStatusLevel } from '@rosen-bridge/health-check';
import { getHealthCheck } from '../guard/HealthCheck';
import Configs from '../configs/Configs';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { exit } from 'process';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);
let lastP2pUp = Date.now();

const healthCheckUpdateJob = async (healthCheck: HealthCheck) => {
  logger.debug(`Updating health status`);
  try {
    await Promise.race([
      healthCheck.update(),
      new Promise((resolve, reject) =>
        setTimeout(() => reject('job timed out'), Configs.healthCheckTimeout)
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
  try {
    // TODO: remove this part after fixing p2p problem
    //  local:ergo/rosen-bridge/p2p#11
    if (Configs.p2pBrokenTimeAllowed !== 0) {
      const status = await healthCheck.getHealthStatusWithParamId(
        'P2P Network'
      );
      if (status?.status === HealthStatusLevel.BROKEN) {
        const diff = Date.now() - lastP2pUp;
        logger.debug(
          `P2p connection is broken for ${Math.floor(diff / 1000)} seconds`
        );
        if (diff > Configs.p2pBrokenTimeAllowed) {
          logger.error(
            `Service exited during broken p2p for ${Configs.p2pBrokenTimeAllowed} seconds`
          );
          exit(1);
        }
      } else {
        logger.debug(`p2p connection is stable`);
        lastP2pUp = Date.now();
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.warn(`P2P broken check failed with error: ${e.message}`);
      if (e.stack) logger.debug(e.stack);
    } else logger.warn(`P2P broken check failed with unknown problem ${e}`);
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
