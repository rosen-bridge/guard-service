import WinstonLogger from '@rosen-bridge/winston-logger';
import Configs from '../configs/Configs';
import MinimumFeeHandler from '../handlers/MinimumFeeHandler';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

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
