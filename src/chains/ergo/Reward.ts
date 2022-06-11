import {
    Address,
    BoxSelection,
    ErgoBox,
    ErgoBoxAssetsDataList, ErgoBoxCandidate,
    ErgoBoxCandidateBuilder,
    ErgoBoxCandidates,
    ErgoBoxes,
    I64,
    ReducedTransaction,
    TokenAmount,
    TokenId,
    TxBuilder
} from "ergo-lib-wasm-nodejs";
import { PaymentTransaction, EventTrigger } from "../../models/Models";
import BaseChain from "../BaseChains";
import ErgoConfigs from "./helpers/ErgoConfigs";
import ExplorerApi from "./network/ExplorerApi";
import Utils from "./helpers/Utils";
import NodeApi from "./network/NodeApi";
import { AssetMap, InBoxesInfo } from "./models/Interfaces";
import Contracts from "../../contracts/Contracts";
import RewardBoxes from "./helpers/RewardBoxes";
import Configs from "../../helpers/Configs";


class Reward implements BaseChain<ReducedTransaction> {

    bankAddress = Address.from_base58(ErgoConfigs.bankAddress)
    bankErgoTree = Utils.addressToErgoTreeString(this.bankAddress)

    /**
     * generates unsigned transaction to distribute rewards from multi-sig address in ergo chain
     * @param event the event trigger model
     * @return the generated payment transaction
     */
    generateTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        // get eventBox and remaining valid commitments
        const eventBox: ErgoBox = RewardBoxes.getEventBox(event)
        const commitmentBoxes: ErgoBox[] = RewardBoxes.getEventValidCommitments(event)

        // create the transaction
        const reducedTx: ReducedTransaction = (event.sourceChainTokenId === "erg") ?
            await this.ergRewardTransaction(event, eventBox, commitmentBoxes) :
            await this.tokenRewardTransaction(event, eventBox, commitmentBoxes)

        // create PaymentTransaction object
        const txBytes = this.serialize(reducedTx)
        const txId = reducedTx.unsigned_tx().id().to_str()
        const eventId = event.sourceTxId
        const tx = new PaymentTransaction(txId, eventId, txBytes)

        console.log(`Payment transaction for event [${tx.eventId}] generated. TxId: ${tx.txId}`)
        return tx
    }

    /**
     * verifies the reward transaction data with the event
     *  1. checks number of output boxes
     *  2. checks ergoTree of all boxes
     *  3. checks number of tokens in watcher and guards boxes
     *  4. checks rwt tokens of watchers
     *  5. checks if input boxes contains all valid commitment boxes and first input box is the event box
     *  6. checks id of token in watcher and guards boxes (token payment)
     *  7. checks amount of token in watcher and guards boxes (token payment)
     *  8. checks if output boxes contains all WIDs in input boxes
     * @param paymentTx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent = (paymentTx: PaymentTransaction, event: EventTrigger): boolean => {

        /**
         * method to verify watcher permit box contract
         */
        const verifyWatcherPermitBoxErgoTree = (box: ErgoBoxCandidate): boolean => {
            return box.ergo_tree().to_base16_bytes() === Utils.contractStringToErgoTreeString(Contracts.watcherPermitContract)
        }

        /**
         * method to verify watcher permit box contract
         */
        const verifyBoxRWTToken = (box: ErgoBoxCandidate): boolean => {
            const boxToken = box.tokens().get(0)
            return boxToken.id().to_str() === rwtToken && Utils.bigintFromI64(boxToken.amount().as_i64()) === 1n
        }

        /**
         * method to verify transaction conditions where it distributes erg
         */
        const verifyErgDistribution = (): boolean => {
            const sizeOfGuardsBoxesTokens: number = guardsBridgeFeeBox.tokens().len() + guardsNetworkFeeBox.tokens().len()

            // verify size of tokens and value of guards boxes
            if (
                Utils.bigintFromBoxValue(guardsBridgeFeeBox.value()) !== guardsBridgeFeeShare ||
                Utils.bigintFromBoxValue(guardsNetworkFeeBox.value()) !== guardsNetworkFeeShare ||
                sizeOfGuardsBoxesTokens !== 0
            ) return false;

            // iterate over permit boxes (last four boxes are guardsBridgeFee, guardsNetworkFee, change and fee boxes)
            for (let i = 0; i < watchersLen; i++) {
                const box = outputBoxes.get(i)
                if (
                    !verifyWatcherPermitBoxErgoTree(box) ||
                    Utils.bigintFromBoxValue(box.value()) !== watcherShare + ErgoConfigs.minimumErg ||
                    box.tokens().len() !== 1
                ) return false;

                // checks rwt token
                if (!verifyBoxRWTToken(box)) return false;

                // add box wid to collection
                outputBoxesWIDs.push(RewardBoxes.getBoxCandidateWIDString(box))
            }
            return true
        }

        /**
         * method to verify transaction conditions where it distributes token
         */
        const verifyTokenDistribution = (): boolean => {
            // verify size of tokens and value of guards boxes
            const rewardTokenId = event.sourceChainTokenId
            if (
                Utils.bigintFromBoxValue(guardsBridgeFeeBox.value()) !== ErgoConfigs.minimumErg ||
                Utils.bigintFromBoxValue(guardsNetworkFeeBox.value()) !== ErgoConfigs.minimumErg ||
                guardsBridgeFeeBox.tokens().len() !== 1 ||
                guardsNetworkFeeBox.tokens().len() !== 1
            ) return false;

            // checks payment token
            const guardsBridgeFeeToken = guardsBridgeFeeBox.tokens().get(0)
            const guardsNetworkFeeToken = guardsNetworkFeeBox.tokens().get(0)
            if (
                guardsBridgeFeeToken.id().to_str() !== rewardTokenId ||
                guardsNetworkFeeToken.id().to_str() !== rewardTokenId ||
                Utils.bigintFromI64(guardsBridgeFeeToken.amount().as_i64()) !== guardsBridgeFeeShare ||
                Utils.bigintFromI64(guardsNetworkFeeToken.amount().as_i64()) !== guardsNetworkFeeShare
            ) return false;

            // iterate over permit boxes (last four boxes are guardsBridgeFee, guardsNetworkFee, change and fee boxes)
            for (let i = 0; i < watchersLen; i++) {
                const box = outputBoxes.get(i)
                if (
                    !verifyWatcherPermitBoxErgoTree(box) ||
                    Utils.bigintFromBoxValue(box.value()) !== ErgoConfigs.minimumErg ||
                    box.tokens().len() !== 2
                ) return false;

                // checks rwt and reward tokens
                const boxRewardToken = box.tokens().get(1)
                if (
                    !verifyBoxRWTToken(box) ||
                    boxRewardToken.id().to_str() !== rewardTokenId ||
                    Utils.bigintFromI64(boxRewardToken.amount().as_i64()) !== watcherShare
                ) return false;

                // add box wid to collection
                outputBoxesWIDs.push(RewardBoxes.getBoxCandidateWIDString(box))
            }
            return true
        }

        const tx = this.deserialize(paymentTx.txBytes).unsigned_tx()
        const outputBoxes = tx.output_candidates()

        // get eventBox and remaining valid commitments
        const eventBox: ErgoBox = RewardBoxes.getEventBox(event)
        const commitmentBoxes: ErgoBox[] = RewardBoxes.getEventValidCommitments(event)
        if (!RewardBoxes.verifyInputs(tx.inputs(), eventBox, commitmentBoxes)) return false

        // verify number of output boxes (number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
        const outputLength = outputBoxes.len()
        const watchersLen = event.WIDs.length + commitmentBoxes.length
        if (outputLength !== watchersLen + 4) return false

        // verify guards and change boxes ergoTree
        const guardsBridgeFeeBox = outputBoxes.get(outputLength - 4)
        const guardsNetworkFeeBox = outputBoxes.get(outputLength - 3)
        if (
            guardsBridgeFeeBox.ergo_tree().to_base16_bytes() !== Utils.addressStringToErgoTreeString(ErgoConfigs.bridgeFeeRepoAddress) ||
            guardsNetworkFeeBox.ergo_tree().to_base16_bytes() !== Utils.addressStringToErgoTreeString(ErgoConfigs.networkFeeRepoAddress) ||
            outputBoxes.get(outputLength - 2).ergo_tree().to_base16_bytes() !== this.bankErgoTree
        ) return false;

        // verify event condition
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare = BigInt(event.networkFee)

        const rwtToken = Configs.ergoRWT
        const outputBoxesWIDs: string[] = []

        if (event.sourceChainTokenId === "erg") {
            if (!verifyErgDistribution()) return false
        }
        else {
            if (!verifyTokenDistribution()) return false
        }

        // verify if all inputs WIDs exist in output boxes
        const inputWIDs = event.WIDs.concat(commitmentBoxes.map(box => Utils.Uint8ArrayToHexString(RewardBoxes.getErgoBoxWID(box))))
        return Utils.doArraysHaveSameStrings(inputWIDs, outputBoxesWIDs)
    }

    /**
     * converts the transaction model in the chain to bytearray
     * @param tx the transaction model in the chain library
     * @return bytearray representation of the transaction
     */
    serialize = (tx: ReducedTransaction): Uint8Array => {
        return tx.sigma_serialize_bytes()
    }

    /**
     * converts bytearray representation of the transaction to the transaction model in the chain
     * @param txBytes bytearray representation of the transaction
     * @return the transaction model in the chain library
     */
    deserialize = (txBytes: Uint8Array): ReducedTransaction => {
        return ReducedTransaction.sigma_parse_bytes(txBytes)
    }

    /**
     * generates unsigned transaction (to pay Erg) of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @param eventBox the event trigger box
     * @param commitmentBoxes the not-merged valid commitment boxes for the event
     * @return the generated reward reduced transaction
     */
    ergRewardTransaction = async (event: EventTrigger, eventBox: ErgoBox, commitmentBoxes: ErgoBox[]): Promise<ReducedTransaction> => {
        // get network current height
        const currentHeight = await NodeApi.getHeight()

        // calculate assets of payment box
        const watchersLen: number = event.WIDs.length + commitmentBoxes.length
        const inErgAmount: bigint = ErgoConfigs.txFee + BigInt(event.bridgeFee) + BigInt(event.networkFee)
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare = BigInt(event.networkFee)

        // calculate needed amount of assets and get input boxes
        const bankBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            inErgAmount
        )
        if (!bankBoxes.covered)
            throw new Error(`Bank boxes didn't cover needed amount of erg: ${inErgAmount.toString()}`)

        // create the output boxes
        const outBoxes = ErgoBoxCandidates.empty()

        // event trigger box watchers
        const rwtTokenId: TokenId = eventBox.tokens().get(0).id()
        event.WIDs.forEach(wid => {
            outBoxes.add(RewardBoxes.createErgRewardBox(
                currentHeight,
                Utils.bigintFromBoxValue(eventBox.value()) / BigInt(event.WIDs.length),
                rwtTokenId,
                watcherShare,
                Utils.hexStringToUint8Array(wid)
            ))
        })

        // commitment boxes watchers
        commitmentBoxes.forEach(box => {
            const wid = RewardBoxes.getErgoBoxWID(box)
            outBoxes.add(RewardBoxes.createErgRewardBox(
                currentHeight,
                Utils.bigintFromBoxValue(box.value()),
                rwtTokenId,
                watcherShare,
                wid
            ))
        })

        // guardsBridgeFeeBox
        outBoxes.add(new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(guardsBridgeFeeShare),
            Utils.addressStringToContract(ErgoConfigs.bridgeFeeRepoAddress),
            currentHeight
        ).build())

        // guardsNetworkFeeBox
        outBoxes.add(new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(guardsNetworkFeeShare),
            Utils.addressStringToContract(ErgoConfigs.networkFeeRepoAddress),
            currentHeight
        ).build())

        // add input boxes
        const inErgoBoxes = new ErgoBoxes(eventBox)
        commitmentBoxes.forEach(box => inErgoBoxes.add(box))

        // calculate assets of change box
        const changeBoxInfo = this.calculateBankBoxesAssets(bankBoxes.boxes, inErgoBoxes)
        const changeErgAmount: bigint = changeBoxInfo.ergs - (BigInt(event.bridgeFee) + BigInt(event.networkFee)) - ErgoConfigs.txFee
        const changeTokens: AssetMap = changeBoxInfo.tokens

        // create the change box
        const changeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(changeErgAmount),
            Utils.addressToContract(this.bankAddress),
            currentHeight
        )
        Object.entries(changeTokens).forEach(([id, amount]) => {
            if (amount !== BigInt(0))
                changeBox.add_token(TokenId.from_str(id), TokenAmount.from_i64(I64.from_str(amount.toString())))
        })

        // create the transaction
        const inBoxes = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        outBoxes.add(changeBox.build())
        const tx = TxBuilder.new(
            inBoxes,
            outBoxes,
            currentHeight,
            Utils.boxValueFromBigint(ErgoConfigs.txFee),
            this.bankAddress,
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg)
        ).build()

        // create ReducedTransaction object
        const ctx = await NodeApi.getErgoStateContext()
        return ReducedTransaction.from_unsigned_tx(
            tx,
            inErgoBoxes,
            ErgoBoxes.empty(),
            ctx
        )
    }


    /**
     * generates unsigned transaction (to pay token) of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @param eventBox the event trigger box
     * @param commitmentBoxes the not-merged valid commitment boxes for the event
     * @return the generated reward reduced transaction
     */
    tokenRewardTransaction = async (event: EventTrigger, eventBox: ErgoBox, commitmentBoxes: ErgoBox[]): Promise<ReducedTransaction> => {
        // get network current height
        const currentHeight = await NodeApi.getHeight()

        // calculate assets of payment box
        const watchersLen: number = event.WIDs.length + commitmentBoxes.length
        const inErgAmount: bigint = 3n * ErgoConfigs.minimumErg + ErgoConfigs.txFee // 3 minimum erg for two guards boxes and change box
        const paymentTokenId: TokenId = TokenId.from_str(event.sourceChainTokenId)
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare = BigInt(event.networkFee)

        // calculate needed amount of assets and get input boxes
        const bankBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            inErgAmount,
            {
                [event.sourceChainTokenId]: BigInt(event.bridgeFee) + BigInt(event.networkFee)
            }
        )
        if (!bankBoxes.covered)
            throw new Error(`Bank boxes didn't cover needed amount of erg: ${inErgAmount.toString()}, or token: [id: ${event.sourceChainTokenId}] amount: ${BigInt(event.bridgeFee) + BigInt(event.networkFee)}`)

        // create the output boxes
        const outBoxes = ErgoBoxCandidates.empty()

        // event trigger box watchers
        const rwtTokenId: TokenId = eventBox.tokens().get(0).id()
        event.WIDs.forEach(wid => outBoxes.add(RewardBoxes.createTokenRewardBox(
            currentHeight,
            Utils.bigintFromBoxValue(eventBox.value()) / BigInt(event.WIDs.length),
            rwtTokenId,
            paymentTokenId,
            watcherShare,
            Utils.hexStringToUint8Array(wid)
        )))

        // commitment boxes watchers
        commitmentBoxes.forEach(box => {
            const wid = RewardBoxes.getErgoBoxWID(box)
            outBoxes.add(RewardBoxes.createTokenRewardBox(
                currentHeight,
                Utils.bigintFromBoxValue(box.value()),
                rwtTokenId,
                paymentTokenId,
                watcherShare,
                wid
            ))
        })

        // guardsBridgeFeeBox
        const guardsBridgeFeeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg),
            Utils.addressStringToContract(ErgoConfigs.bridgeFeeRepoAddress),
            currentHeight
        )
        guardsBridgeFeeBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(guardsBridgeFeeShare)))
        outBoxes.add(guardsBridgeFeeBox.build())

        // guardsNetworkFeeBox
        const guardsNetworkFeeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg),
            Utils.addressStringToContract(ErgoConfigs.networkFeeRepoAddress),
            currentHeight
        )
        guardsNetworkFeeBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(guardsNetworkFeeShare)))
        outBoxes.add(guardsNetworkFeeBox.build())

        // add input boxes
        const inErgoBoxes = new ErgoBoxes(eventBox)
        commitmentBoxes.forEach(box => inErgoBoxes.add(box))

        // calculate assets of change box
        const changeBoxInfo = this.calculateBankBoxesAssets(bankBoxes.boxes, inErgoBoxes)
        const changeErgAmount: bigint = changeBoxInfo.ergs - (2n * ErgoConfigs.minimumErg) - ErgoConfigs.txFee // reduce other boxes ergs (two guards boxes)
        const changeTokens: AssetMap = changeBoxInfo.tokens
        changeTokens[event.sourceChainTokenId] -= BigInt(event.bridgeFee) + BigInt(event.networkFee)

        // create the change box
        const changeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(changeErgAmount),
            Utils.addressToContract(this.bankAddress),
            currentHeight
        )
        Object.entries(changeTokens).forEach(([id, amount]) => {
            if (amount !== BigInt(0))
                changeBox.add_token(TokenId.from_str(id), TokenAmount.from_i64(I64.from_str(amount.toString())))
        })

        // create the transaction
        const inBoxes = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        outBoxes.add(changeBox.build())
        const tx = TxBuilder.new(
            inBoxes,
            outBoxes,
            currentHeight,
            Utils.boxValueFromBigint(ErgoConfigs.txFee),
            this.bankAddress,
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg)
        ).build()

        // create ReducedTransaction object
        const ctx = await NodeApi.getErgoStateContext()
        return ReducedTransaction.from_unsigned_tx(
            tx,
            inErgoBoxes,
            ErgoBoxes.empty(),
            ctx
        )
    }

    /**
     * calculates amount of ergs and tokens in ergo input boxes
     * @param boxes the ergo input boxes
     * @param inErgoBoxes the other input boxes
     */
    calculateBankBoxesAssets = (boxes: ErgoBox[], inErgoBoxes: ErgoBoxes): InBoxesInfo => {
        let changeErgAmount = BigInt(0)
        const changeTokens: AssetMap = {}

        boxes.forEach(box => {
            changeErgAmount += Utils.bigintFromI64(box.value().as_i64())
            const tokenSize = box.tokens().len()
            for (let i = 0; i < tokenSize; i++) {
                const token = box.tokens().get(i)
                if (Object.prototype.hasOwnProperty.call(changeTokens, token.id().to_str()))
                    changeTokens[token.id().to_str()] += Utils.bigintFromI64(token.amount().as_i64())
                else
                    changeTokens[token.id().to_str()] = Utils.bigintFromI64(token.amount().as_i64())
            }

            inErgoBoxes.add(box)
        })
        return {
            inBoxes: inErgoBoxes,
            ergs: changeErgAmount,
            tokens: changeTokens
        }
    }

}

export default Reward
