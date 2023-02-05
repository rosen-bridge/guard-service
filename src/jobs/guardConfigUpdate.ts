import { guardConfig } from '../helpers/GuardConfig';
import Configs from '../helpers/Configs';
import { loggerFactory } from '../log/Logger';
import { AxiosError } from 'axios';

const logger = loggerFactory(import.meta.url);

/**
 * updates the guard config periodically
 */
const configUpdateJob = async () => {
  try {
    await guardConfig.setConfig();
    setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
  } catch (e) {
    if (e instanceof AxiosError) {
      if (e.response) {
        logger.warn(
          `An error occurred while getting boxes from the explorer. The request was made and the server responded with a non-2xx code: ${e}\n${e.stack}`,
          {
            code: e.code,
            data: e.response.data,
            request: e.request,
          }
        );
      } else if (e.request) {
        logger.warn(
          `An error occurred while getting boxes from the explorer. The request was made but no response was received. Make sure TSS is up and accessible: ${e}\n${e.stack}`,
          {
            code: e.code,
            request: e.request,
          }
        );
      } else {
        logger.warn(
          `An error occurred while getting boxes from the explorer. Something happened in setting up the request that triggered the error: ${e}\n${e.stack}`
        );
      }
    } else if (e instanceof Error) {
      logger.warn(
        `Updating guard config failed with error: ${e.message} - ${e.stack}`
      );
      setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000);
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
