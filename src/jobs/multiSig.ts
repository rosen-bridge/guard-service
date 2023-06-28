import MultiSigHandler from '../guard/multisig/MultiSigHandler';
import Configs from '../helpers/Configs';

/**
 * runs MultiSig service cleanUp job
 */
const multiSigCleanupJob = () => {
  MultiSigHandler.getInstance().cleanup();
  setTimeout(multiSigCleanupJob, Configs.multiSigCleanUpInterval * 1000);
};

/**
 * runs all jobs of MultiSig service
 */
const initializeMultiSigJobs = () => {
  multiSigCleanupJob();
};

export { initializeMultiSigJobs };
