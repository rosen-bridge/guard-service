import { guardConfig } from '../helpers/GuardConfig';
import Configs from '../helpers/Configs';

/**
 * updates the guard config periodically
 */
const configUpdateJob = () => {
  guardConfig
    .setConfig()
    .then(() =>
      setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000)
    );
};

/**
 * initializing update job
 */
const guardConfigUpdate = () => {
  configUpdateJob();
};

export { guardConfigUpdate };
