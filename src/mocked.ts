import { ErgoBox, ReducedTransaction, Transaction } from "ergo-lib-wasm-nodejs";

export class mockedMultiSig {
    private static instance: mockedMultiSig;

    static getInstance = () => {
        if (!mockedMultiSig.instance) mockedMultiSig.instance = new mockedMultiSig()
        return mockedMultiSig.instance
    }

    sign = async (reducedTx: ReducedTransaction, requiredSign: number, boxes: Array<ErgoBox>, dataInputs: Array<ErgoBox>): Promise<Transaction> => {
        return new Transaction()
    }

    cleanup = async () => {
        return Promise.resolve("cleanup")
    }
}