import "reflect-metadata";
import { initDataSources } from "./helpers/dataSources";
import { initializeMultiSigJobs } from "./jobs/multiSig";
import { initExpress } from "./jobs/express";
import { startTssInstance } from "./jobs/tss";
import { runProcessors } from "./jobs/runProcessors";
import MultiSigHandler from "./guard/multisig/MultiSig";
import Configs from "./helpers/Configs";
import { initScanner } from "./jobs/initScanner";
import { guardConfigUpdate } from "./jobs/guardConfigUpdate";
import { guardConfig } from "./helpers/GuardConfig";


const init = async () => {
    // init guards config
    await guardConfig.setConfig()

    // initialize all data sources
    await initDataSources()

    // initialize express Apis
    await initExpress()

    // guard config update job
    guardConfigUpdate()

    // initialize tss multiSig object
    MultiSigHandler.getInstance(guardConfig.publicKeys, Configs.guardSecret)
    initializeMultiSigJobs()

    // start tss instance
    startTssInstance()

    // run network scanners
    initScanner()

    // run processors
    runProcessors()

}

init().then(() => null)

