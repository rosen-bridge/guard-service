import "reflect-metadata";
import { initDataSources } from "./helpers/dataSources";
import { initializeMultiSigJobs } from "./jobs/multiSig";
import { initExpress } from "./jobs/express";
import { tssInstance } from "./jobs/tss";
import { processEvents } from "./jobs/processEvents";
import MultiSigHandler from "./guard/multisig/MultiSig";
import Configs from "./helpers/Configs";


const init = async () => {

    // initialize all data sources
    await initDataSources()

    // initialize express Apis
    await initExpress()

    // initialize tss multiSig object
    MultiSigHandler.getInstance(Configs.guardsPublicKeys, Configs.guardSecret)
    initializeMultiSigJobs()

    // run tss instance
    tssInstance()

    // run network scanners
    // TODO

    // run process events to agree on events and sign approved events
    processEvents()

}

init().then(() => null)

