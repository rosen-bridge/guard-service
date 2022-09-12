import ergoConfigs from "../chains/ergo/helpers/ErgoConfigs";
import { guardConfig } from "../helpers/GuardConfig";
import Configs from "../helpers/Configs";

const configUpdateJob = () => {
    guardConfig.setConfig().then(() => setTimeout(configUpdateJob, Configs.guardConfigUpdateInterval * 1000))
}

const guardConfigUpdate = () => {
    configUpdateJob()
}
