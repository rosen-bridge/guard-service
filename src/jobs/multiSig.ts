import MultiSigHandler from '../handlers/MultiSigHandler';
import Configs from '../configs/Configs';

/**
 * runs MultiSig service cleanUp job
 */
const multiSigCleanupJob = () => {
  MultiSigHandler.getInstance().getErgoMultiSig().cleanup();
  setTimeout(multiSigCleanupJob, Configs.multiSigCleanUpInterval * 1000);
};

/**
 * runs all jobs of MultiSig service
 */
const initializeMultiSigJobs = () => {
  multiSigCleanupJob();
};

export { initializeMultiSigJobs };
