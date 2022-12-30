import { guardConfig } from '../helpers/GuardConfig';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

/**
 * updates the guard config periodically
 */
const configUpdateJob = async () => {
  try {
    await guardConfig.setConfig();
    setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
  } catch (e) {
    if (e instanceof Error) {
      logger.warn(`Updating guard config failed with error: ${e.stack}`);
      setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
    } else {
      logger.error('Guard config updating failed');
      throw e;
    }
  }
};

/**
 * initializing update job
 */
const guardConfigUpdate = () => {
  configUpdateJob();
};

export { guardConfigUpdate };
