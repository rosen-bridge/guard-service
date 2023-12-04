import Configs from '../configs/Configs';
import Tss from '../guard/Tss';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);
/**
 * runs Tss service update job
 */
const tssUpdateJob = () => {
  Tss.getInstance()
    .update()
    .then(() => setTimeout(tssUpdateJob, Configs.tssUpdateInterval * 1000))
    .catch((e) => {
      logger.error(`Tss update job failed with error: ${e}`);
      setTimeout(tssUpdateJob, Configs.tssUpdateInterval * 1000);
    });
};

export { tssUpdateJob };
