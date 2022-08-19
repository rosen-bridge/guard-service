import MultiSigHandler from "../guard/multisig/MultiSig";
import Configs from "../helpers/Configs";

/**
 * runs MultiSig service cleanUp job
 */
const multiSigCleanupJob = () => {
    MultiSigHandler.getInstance(Configs.guardsPublicKeys, Configs.guardSecret).cleanup()
    setTimeout(multiSigCleanupJob, Configs.multiSigCleanUpInterval * 1000)
}

/**
 * runs all jobs of MultiSig service
 */
const initializeMultiSigJobs = () => {
    multiSigCleanupJob()
}

export { initializeMultiSigJobs }