import MultiSigHandler from "../guard/multisig/MultiSig";
import Configs from "../helpers/Configs";

const multiSigInterval = 30 * 1000

const multiSigCleanupJob = () => {
    MultiSigHandler.getInstance(Configs.guardsPublicKeys, Configs.guardSecret).cleanup()
    setTimeout(multiSigCleanupJob, multiSigInterval)
}

export const initializeMultiSigJobs = () => {
    multiSigCleanupJob()
}
