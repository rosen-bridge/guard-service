import * as wasm from 'ergo-lib-wasm-nodejs';
import NodeApi from "../../chains/ergo/network/NodeApi";
import { CommitmentJson, PublishedCommitment } from "./Interfaces";


const publicKeyToProposition = (pubKeys: Array<string>): wasm.Propositions => {
    const res = new wasm.Propositions();
    pubKeys.forEach(item => {
        res.add_proposition_from_byte(Uint8Array.from(Buffer.from('cd' + item, 'hex')));
    });
    return res
}

const extract_hints = async (
    tx: wasm.Transaction,
    boxes: Array<wasm.ErgoBox>,
    dataBoxes: Array<wasm.ErgoBox>,
    signed: Array<string>,
    simulated: Array<string>
) => {
    console.log("in extract hints")
    console.log(tx)
    console.log(boxes)
    console.log(dataBoxes)
    console.log(signed)
    console.log(simulated)
    const simulatedPropositions = publicKeyToProposition(simulated);
    const realPropositions = publicKeyToProposition(signed);
    const inputBoxes = wasm.ErgoBoxes.empty();
    boxes.forEach(item => inputBoxes.add(item))
    const dataInputBoxes = wasm.ErgoBoxes.empty();
    dataBoxes.forEach(item => dataInputBoxes.add(item))
    const context = await NodeApi.getErgoStateContext()
    return wasm.extract_hints(
        tx,
        context,
        inputBoxes,
        dataInputBoxes,
        realPropositions,
        simulatedPropositions
    )
}

const add_hints = (
    currentHints: wasm.TransactionHintsBag,
    newHints: wasm.TransactionHintsBag,
    tx: wasm.ReducedTransaction
) => {
    for (let index = 0; index < tx.unsigned_tx().inputs().len(); index++) {
        currentHints.add_hints_for_input(
            index,
            newHints.all_hints_for_input(index)
        )
    }
}

const convertToHintBag = (
    commitments: PublishedCommitment,
    pubKey: string,
) => {
    const resultJson: CommitmentJson = {
        secretHints: {},
        publicHints: {}
    }
    Object.keys(commitments).forEach((key) => {
        const inputCommitments = commitments[key]
        resultJson.secretHints[key] = []
        if (!resultJson.publicHints[key]) {
            resultJson.publicHints[key] = []
        }
        inputCommitments.forEach(commitment => {
            resultJson.publicHints[key].push({
                a: commitment.a,
                hint: "cmtReal",
                position: commitment.position,
                type: "dlog",
                pubkey: {
                    op: "205",
                    h: pubKey
                }
            })
        })
    })
    return wasm.TransactionHintsBag.from_json(JSON.stringify(resultJson))
}

export {
    extract_hints,
    add_hints,
    convertToHintBag
}