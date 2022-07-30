import {multiSigObj} from "../index";

const multiSigInterval = 30 * 1000

// TODO: remove
// const multiSigSignJob = () => {
//     multiSigObj.sign().then(() => setTimeout(multiSigSignJob, multiSigInterval))
// }

const multiSigCleanupJob = () => {
    multiSigObj.cleanup().then(() => setTimeout(multiSigCleanupJob, multiSigInterval))
}

export const initializeMultiSigJobs = () => {
    // multiSigSignJob()
    multiSigCleanupJob()
}
