import "reflect-metadata";
import { initDataSources } from "./helpers/dataSources";
import { initializeMultiSigJobs } from "./jobs/multiSig";
import { initExpress } from "./jobs/express";
import { tssInstance } from "./jobs/tss";
import { processEvents } from "./jobs/processEvents";
import MultiSigHandler from "./guard/multisig/MultiSig";
import Configs from "./helpers/Configs";
import { initScanner } from "./jobs/initScanner";


const init = async () => {

    // initialize all data sources
    await initDataSources()
    console.log("here")


    // initialize express Apis
    await initExpress()
    console.log("here1")

    // initialize tss multiSig object
    MultiSigHandler.getInstance(Configs.guardsPublicKeys, Configs.guardSecret)
    initializeMultiSigJobs()
    console.log("here2")

    // run tss instance
    tssInstance()
    console.log("here3")

    // run network scanners
    initScanner()
    console.log("here4")

    // run process events to agree on events and sign approved events
    processEvents()

}

init().then(() => null)

