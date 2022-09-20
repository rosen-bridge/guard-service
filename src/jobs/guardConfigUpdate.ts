import { GuardConfig } from "../helpers/GuardConfig";
import Configs from "../helpers/Configs";

/**
 * updates the guard config periodically
 */
const configUpdateJob = () => {
    GuardConfig.setConfig().then(() => setTimeout(configUpdateJob, Configs.GuardConfigUpdateInterval * 1000))
}

const guardConfigUpdate = () => {
    configUpdateJob()
}

export { guardConfigUpdate }
