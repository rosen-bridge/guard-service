import "reflect-metadata";
import { initDataSources } from "./helpers/dataSources";
import { initializeMultiSigJobs } from "./jobs/multiSig";
import { initExpress } from "./jobs/express";
import { tssInstance } from "./jobs/tss";
import { processEvents } from "./jobs/processEvents";
import { ErgoBox, ReducedTransaction } from "ergo-lib-wasm-nodejs";

export class mockedMultiSig {
    private static instance: mockedMultiSig;

    static getInstance = () => {
        if(this.instance) this.instance = new mockedMultiSig()
        return this.instance
    }

    sign = async (reducedTx: ReducedTransaction, requiredSign: number, boxes: Array<ErgoBox>, dataInputs: Array<ErgoBox>) => {
        return Promise.resolve("Sign")
    }

    cleanup = async () => {
        return Promise.resolve("cleanup")
    }
}

export let multiSigObj: mockedMultiSig; // TODO: multiSigObject type


const init = async () => {

    // initialize all data sources
    await initDataSources()

    // initialize express Apis
    await initExpress()

    // initialize tss multiSig object
    multiSigObj = new mockedMultiSig()
    initializeMultiSigJobs()

    // run tss instance
    tssInstance()

    // run network scanners
    // TODO

    // run process events to agree on events and sign approved events
    processEvents()

}

init()

