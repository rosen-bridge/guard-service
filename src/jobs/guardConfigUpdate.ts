import { guardConfig } from '../helpers/GuardConfig';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';
import axios from 'axios';

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
      logger.warn(`Updating guard config failed with error: ${e}`);
      logger.warn(e.stack);
      setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
    } else {
      logger.error('Guard config updating failed');
      logger.error(e.stack);
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
