import { EventTrigger } from "../../../models/Models";
import {
    BoxValue,
    Constant,
    ErgoBox,
    ErgoBoxCandidate,
    ErgoBoxCandidateBuilder, I64,
    TokenAmount,
    TokenId, Tokens, TxId
} from "ergo-lib-wasm-nodejs";
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
     * @param rwtTokenId RWT token id of the source chain
     * @param watcherShare reward erg amount
     * @param wid watcher id
     */
    static createErgRewardBox = (height: number, rwtTokenId: TokenId, watcherShare: bigint, wid: Uint8Array): ErgoBoxCandidate => {
        const watcherBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(watcherShare + ErgoConfigs.minimumErg),
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
     * @param rwtTokenId RWT token id of the source chain
     * @param paymentTokenId reward token id
     * @param paymentTokenAmount reward token amount
     * @param wid watcher id
     */
    static createTokenRewardBox = (height: number, rwtTokenId: TokenId, paymentTokenId: TokenId, paymentTokenAmount: bigint, wid: Uint8Array): ErgoBoxCandidate => {
        const watcherBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg),
            Contracts.watcherPermitContract,
            height
        )
        watcherBox.add_token(rwtTokenId, TokenAmount.from_i64(Utils.i64FromBigint(1n)))
        watcherBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(paymentTokenAmount)))
        watcherBox.set_register_value(4, Constant.from_coll_coll_byte([wid]))
        return watcherBox.build()
    }

}

export default RewardBoxes
