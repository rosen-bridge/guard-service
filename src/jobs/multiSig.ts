import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

import Configs from '../configs/configs';
import MultiSigHandler from '../handlers/multiSigHandler';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * runs MultiSig service cleanUp job
 */
const multiSigCleanupJob = () => {
  MultiSigHandler.getInstance().getErgoMultiSig().cleanup();
  setTimeout(multiSigCleanupJob, Configs.multiSigCleanUpInterval * 1000);
};

/**
 * runs MultiSig service handle turn job
 */
const multiSigTurnJob = () => {
  MultiSigHandler.getInstance()
    .getErgoMultiSig()
    .handleMyTurn()
    .then(() =>
      setTimeout(multiSigTurnJob, Configs.multiSigHandleTurnInterval * 1000),
    )
    .catch((e) => {
      logger.error(`MultiSig handle turn job failed with error: ${e}`);
      setTimeout(multiSigTurnJob, Configs.multiSigHandleTurnInterval * 1000);
    });
};

/**
 * runs all jobs of MultiSig service
 */
const initializeMultiSigJobs = () => {
  multiSigCleanupJob();
  multiSigTurnJob();
};

export { initializeMultiSigJobs };
