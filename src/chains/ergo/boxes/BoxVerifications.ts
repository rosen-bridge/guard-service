import {
    ErgoBox, ErgoBoxCandidate,
    ErgoBoxCandidates,
    UnsignedInputs
} from "ergo-lib-wasm-nodejs";
import ErgoUtils from "../helpers/ErgoUtils";

class BoxVerifications {

    /**
     * checks if input boxes contain all valid commitments and the event box (also inputBoxes match serialized inputs)
     * @param inputBoxes the transaction input boxes
     * @param eventBox the event trigger box
     * @param commitmentBoxes the event valid commitment boxes that didn't merge
     * @param serializedInputs serialized bytes of input boxes in Ergo Transaction object
     */
    static verifyInputs = (
        inputBoxes: UnsignedInputs,
        eventBox: ErgoBox,
        commitmentBoxes: ErgoBox[],
        serializedInputs: Uint8Array[]
    ): boolean => {
        if (
            inputBoxes.len() !== serializedInputs.length ||
            inputBoxes.get(0).box_id().to_str() !== eventBox.box_id().to_str()
        ) return false

        const inputBoxIds: string[] = []
        const sizeOfInputs = inputBoxes.len()
        for (let i = 1; i < sizeOfInputs; i++) {
            if (inputBoxes.get(i).box_id().to_str() !== ErgoBox.sigma_parse_bytes(serializedInputs[i]).box_id().to_str())
                return false
            inputBoxIds.push(inputBoxes.get(i).box_id().to_str())
        }

        return !commitmentBoxes.some(box => !inputBoxIds.includes(box.box_id().to_str()))
    }

    /**
     * checks if all tokens in inputs exists in output (no token burned)
     * @param inBoxesBytes serialized input boxes
     * @param outputBoxes transaction output boxes
     */
    static verifyNoTokenBurned = (inBoxesBytes: Uint8Array[], outputBoxes: ErgoBoxCandidates): boolean => {
        // calculate inputs tokens
        const inputAssets = ErgoUtils.calculateBoxesAssets(inBoxesBytes.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes)))

        // calculate outputs tokens
        const outBoxes: ErgoBoxCandidate[] = []
        for (let i = 0; i < outputBoxes.len(); i++)
            outBoxes.push(outputBoxes.get(i))
        const outputAssets = ErgoUtils.calculateBoxesAssets(outBoxes)

        return (
            inputAssets.ergs === outputAssets.ergs &&
            ErgoUtils.areAssetsEqual(inputAssets.tokens, outputAssets.tokens)
        )
    }

    /**
     * method to verify boxes contract, erg value, tokens and register 4, one to one
     * @param boxes
     * @param expectedBoxes
     */
    static verifyOutputBoxesList = (
        boxes: ErgoBoxCandidate[],
        expectedBoxes: ErgoBoxCandidate[]
    ): boolean => {
        if (boxes.length !== expectedBoxes.length) return false

        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i]
            const expectedBox = expectedBoxes[i]

            if (
                box.ergo_tree().to_base16_bytes() !== expectedBox.ergo_tree().to_base16_bytes() ||
                ErgoUtils.bigintFromBoxValue(box.value()) !== ErgoUtils.bigintFromBoxValue(expectedBox.value()) ||
                box.tokens().len() !== expectedBox.tokens().len()
            ) return false

            for (let j = 0; j < box.tokens().len(); j++) {
                const token = box.tokens().get(j)
                const expectedToken = box.tokens().get(j)
                if (
                    token.id().to_str() !== expectedToken.id().to_str() ||
                    ErgoUtils.bigintFromTokenAmount(token.amount()) !== ErgoUtils.bigintFromTokenAmount(expectedToken.amount())
                ) return false
            }

            const boxR4 = box.register_value(4)?.to_coll_coll_byte()[0]
            const expectedBoxR4 = expectedBox.register_value(4)?.to_coll_coll_byte()[0]

            if (expectedBoxR4 !== undefined) {
                if (
                    boxR4 === undefined ||
                    Buffer.from(boxR4).toString("hex") !== Buffer.from(expectedBoxR4).toString("hex")
                ) return false
            }
            else {
                if (boxR4 !== undefined) return false
            }
        }

        return true
    }

}

export default BoxVerifications
