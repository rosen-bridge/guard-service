import GuardPkHandler from '../handlers/GuardPkHandler';
import Configs from '../configs/Configs';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

/**
 * updates the guard config periodically
 */
const configUpdateJob = async () => {
  try {
    const pkHandler = GuardPkHandler.getInstance();
    await pkHandler.update();
    pkHandler.updateDependentModules();
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

export { configUpdateJob };
