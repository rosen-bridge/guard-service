import GuardPkHandler from '../handlers/GuardPkHandler';
import Configs from '../configs/Configs';
import { winstonLogger } from '../log/Logger';

const logger = winstonLogger.getLogger(import.meta.url);

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
    logger.warn(`Updating guards public keys failed with error: ${e}`);
    logger.warn(e.stack);
    setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
  }
};

export { configUpdateJob };
