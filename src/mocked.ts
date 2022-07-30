import { ErgoBox, ReducedTransaction } from "ergo-lib-wasm-nodejs";

export class mockedMultiSig {
    private static instance: mockedMultiSig;

    static getInstance = () => {
        if (!mockedMultiSig.instance) mockedMultiSig.instance = new mockedMultiSig()
        return mockedMultiSig.instance
    }

    sign = async (reducedTx: ReducedTransaction, requiredSign: number, boxes: Array<ErgoBox>, dataInputs: Array<ErgoBox>) => {
        return Promise.resolve("Sign")
    }

    cleanup = async () => {
        return Promise.resolve("cleanup")
    }
}