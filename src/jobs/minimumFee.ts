import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import Configs from '../configs/Configs';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * runs MinimumFee update job
 */
export const minimumFeeUpdateJob = () => {
  MinimumFeeHandler.getInstance()
    .update()
    .then(() =>
      setTimeout(minimumFeeUpdateJob, Configs.minimumFeeUpdateInterval * 1000)
    )
    .catch((e) => {
      logger.error(`Minimum fee update job failed with error: ${e}`);
      setTimeout(minimumFeeUpdateJob, Configs.minimumFeeUpdateInterval * 1000);
    });
};
