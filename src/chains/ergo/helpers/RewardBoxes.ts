import { EventTrigger } from "../../../models/Models";
import {
    BoxValue,
    Constant,
    ErgoBox,
    ErgoBoxCandidate,
    ErgoBoxCandidateBuilder, ErgoBoxCandidates, I64,
    TokenAmount,
    TokenId, Tokens, TxId, UnsignedInputs
} from "ergo-lib-wasm-nodejs";
import { AssetMap } from "../models/Interfaces";
import Utils from "./Utils";
import ErgoConfigs from "./ErgoConfigs";
import Contracts from "../../../contracts/Contracts";

class RewardBoxes {

    /**
     * @param event the event trigger model
     * @return the corresponding box of the event trigger
     */
    static getEventBox = (event: EventTrigger): ErgoBox => { // TODO: implement this
        return new ErgoBox(
            BoxValue.from_i64(I64.from_str("4000000000")),
            5,
            Utils.addressStringToContract(ErgoConfigs.bankAddress),
            TxId.from_str("0000000000000000000000000000000000000000000000000000000000000000"),
            0,
            new Tokens()
        )
    }

    /**
     * gets the commitment boxes which created before the event trigger and didn't merge into it
     * @param event the event trigger model
     * @return the valid commitment boxes
     */
    static getEventValidCommitments = (event: EventTrigger): ErgoBox[] => {
        return [] // TODO: implement this
    }

    /**
     * reads WID from register r4 of the commitment box (box type is ErgoBox)
     * @param box the commitment box
     */
    static getErgoBoxWID = (box: ErgoBox): Uint8Array => {
        const wid = box.register_value(4)?.to_coll_coll_byte()[0]
        if (wid === undefined) throw new Error(`failed to read WID from register R4 of box [${box.box_id().to_str()}]`)
        return wid!
    }

    /**
     * reads WID from register r4 of the commitment box (box type is ErgoBoxCandidate)
     * @param box the commitment box
     */
    static getBoxCandidateWIDString = (box: ErgoBoxCandidate): string => {
        const wid = box.register_value(4)?.to_coll_coll_byte()[0]
        if (wid === undefined) throw new Error(`failed to read WID from register R4 of box candidate`)
        return Buffer.from(wid!).toString("hex")
    }

    /**
     * creates an ErgoBox with watcher-permit contract containing event reward (reward is erg)
     * @param height current height of blockchain
     * @param ergValue minimum erg in event or commitment box
     * @param rwtTokenId RWT token id of the source chain
     * @param watcherShare reward erg amount
     * @param wid watcher id
     */
    static createErgRewardBox = (height: number, ergValue: bigint, rwtTokenId: TokenId, watcherShare: bigint, wid: Uint8Array): ErgoBoxCandidate => {
        const watcherBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(watcherShare + ergValue),
            Contracts.watcherPermitContract,
            height
        )
        watcherBox.add_token(rwtTokenId, TokenAmount.from_i64(Utils.i64FromBigint(1n)))
        watcherBox.set_register_value(4, Constant.from_coll_coll_byte([wid]))
        return watcherBox.build()
    }

    /**
     * creates an ErgoBox with watcher-permit contract containing event reward (reward is token)
     * @param height current height of blockchain
     * @param ergValue minimum erg in event or commitment box
     * @param rwtTokenId RWT token id of the source chain
     * @param paymentTokenId reward token id
     * @param paymentTokenAmount reward token amount
     * @param wid watcher id
     */
    static createTokenRewardBox = (height: number, ergValue: bigint, rwtTokenId: TokenId, paymentTokenId: TokenId, paymentTokenAmount: bigint, wid: Uint8Array): ErgoBoxCandidate => {
        const watcherBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(ergValue),
            Contracts.watcherPermitContract,
            height
        )
        watcherBox.add_token(rwtTokenId, TokenAmount.from_i64(Utils.i64FromBigint(1n)))
        if (paymentTokenAmount > 0) watcherBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(paymentTokenAmount)))
        watcherBox.set_register_value(4, Constant.from_coll_coll_byte([wid]))
        return watcherBox.build()
    }

    /**
     * checks if input boxes contain all valid commitments and the event box
     * @param inputBoxes the transaction input boxes
     * @param eventBox the event trigger box
     * @param commitmentBoxes the event valid commitment boxes that didn't merge
     */
    static verifyInputs = (inputBoxes: UnsignedInputs, eventBox: ErgoBox, commitmentBoxes: ErgoBox[]): boolean => {
        if (inputBoxes.get(0).box_id().to_str() !== eventBox.box_id().to_str()) return false

        const inputBoxIds: string[] = []
        const sizeOfInputs = inputBoxes.len()
        for (let i = 1; i < sizeOfInputs; i++)
            inputBoxIds.push(inputBoxes.get(i).box_id().to_str())

        return !commitmentBoxes.some(box => !inputBoxIds.includes(box.box_id().to_str()))
    }

    /**
     * checks if all tokens in inputs exists in output (no token burned)
     * @param txInputs input boxes in Ergo Transaction object
     * @param inBoxesBytes input boxes in PaymentTransaciton obejct
     * @param outputBoxes transaction output boxes
     */
    static verifyNoTokenBurned = (txInputs: UnsignedInputs, inBoxesBytes: Uint8Array[], outputBoxes: ErgoBoxCandidates): boolean => {
        try {
            const outputLength = outputBoxes.len()
            // verify object inputs are same as tx inputs
            const objectInIds: string[] = []
            const txInIds: string[] = []

            // calculate inputs tokens
            const inputTokens: AssetMap = {}
            inBoxesBytes.forEach(boxBytes => {
                const box = ErgoBox.sigma_parse_bytes(boxBytes)
                const boxTokensLen = box.tokens().len()

                for (let i = 0; i < boxTokensLen; i++) {
                    const tokenId = box.tokens().get(i).id().to_str()
                    if (Object.prototype.hasOwnProperty.call(inputTokens, tokenId))
                        inputTokens[tokenId] += Utils.bigintFromI64(box.tokens().get(i).amount().as_i64())
                    else
                        inputTokens[tokenId] = Utils.bigintFromI64(box.tokens().get(i).amount().as_i64())
                }
                objectInIds.push(box.box_id().to_str())
            })

            // calculate tx input boxes ids
            const inputsLen = txInputs.len()
            if (inputsLen != inBoxesBytes.length) return false
            for (let i = 0; i < inputsLen; i++) txInIds.push(txInputs.get(i).box_id().to_str())

            // reject tx if input boxes in PaymentTransaction object are not same as tx inputs
            if (!Utils.doArraysHaveSameStrings(objectInIds, txInIds)) return false

            // calculate outputs tokens
            const outputTokens: AssetMap = {}
            for (let i = 0; i < outputLength; i++) {
                const box = outputBoxes.get(i)
                const boxTokensLen = box.tokens().len()

                for (let j = 0; j < boxTokensLen; j++) {
                    const tokenId = box.tokens().get(j).id().to_str()
                    if (Object.prototype.hasOwnProperty.call(outputTokens, tokenId))
                        outputTokens[tokenId] += Utils.bigintFromI64(box.tokens().get(j).amount().as_i64())
                    else
                        outputTokens[tokenId] = Utils.bigintFromI64(box.tokens().get(j).amount().as_i64())
                }
            }

            return Utils.areAssetsEqual(inputTokens, outputTokens)
        }
        catch (e) {
            console.log(`An error occurred while parsing Ergo tx inputs to verify no token burn: ${e.message}. Rejecting tx`)
            return false
        }
    }

}

export default RewardBoxes
