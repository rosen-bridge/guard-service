import {
    Address,
    BoxSelection, Constant,
    ErgoBox,
    ErgoBoxAssetsDataList,
    ErgoBoxCandidateBuilder,
    ErgoBoxCandidates,
    ErgoBoxes,
    I64,
    ReducedTransaction,
    TokenAmount,
    TokenId,
    TxBuilder, UnsignedInputs
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
     *  4. checks id of token in watcher and guards boxes (token payment)
     *  5. checks amount of token in watcher and guards boxes (token payment)
     *  6. checks if output boxes contains all WIDs in input boxes
     * @param paymentTx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent = (paymentTx: PaymentTransaction, event: EventTrigger): boolean => {
        const tx = this.deserialize(paymentTx.txBytes).unsigned_tx()
        const outputBoxes = tx.output_candidates()

        // get eventBox and remaining valid commitments
        const eventBox: ErgoBox = RewardBoxes.getEventBox(event)
        const commitmentBoxes: ErgoBox[] = RewardBoxes.getEventValidCommitments(event)
        if (!this.verifyInputs(tx.inputs(), eventBox, commitmentBoxes)) return false

        // verify number of output boxes
        const outputLength = outputBoxes.len()
        if (outputLength !== event.WIDs.length + commitmentBoxes.length + 2) return false

        // verify guards and change boxes ergoTree
        const guardsBridgeFeeBox = outputBoxes.get(outputLength - 3)
        const guardsNetworkFeeBox = outputBoxes.get(outputLength - 2)
        if (
            guardsBridgeFeeBox.ergo_tree().to_base16_bytes() !== Utils.addressStringToErgoTreeString(ErgoConfigs.bridgeFeeRepoAddress) ||
            guardsNetworkFeeBox.ergo_tree().to_base16_bytes() !== Utils.addressStringToErgoTreeString(ErgoConfigs.networkFeeRepoAddress) ||
            outputBoxes.get(outputLength - 1).ergo_tree().to_base16_bytes() !== this.bankErgoTree
        ) return false;

        // verify event condition
        const watchersLen = event.WIDs.length + commitmentBoxes.length
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare: bigint = BigInt(event.networkFee)

        const rwtToken = Configs.ergoRWT
        const outputBoxesWIDs: Uint8Array[] = []
        if (event.sourceChainTokenId === "erg") { // Erg payment case
            const sizeOfGuardsBoxesTokens: number = guardsBridgeFeeBox.tokens().len() + guardsNetworkFeeBox.tokens().len()

            // verify size of tokens and value of guards boxes
            if (
                Utils.bigintFromBoxValue(guardsBridgeFeeBox.value()) !== guardsBridgeFeeShare ||
                Utils.bigintFromBoxValue(guardsNetworkFeeBox.value()) !== guardsNetworkFeeShare ||
                sizeOfGuardsBoxesTokens !== 0
            ) return false;

            // iterate over permit boxes (last four boxes are guardsBridgeFee, guardsNetworkFee, change and fee boxes)
            for (let i = 0; i < outputLength - 4; i++) {
                const box = outputBoxes.get(i)
                if (
                    box.ergo_tree().to_base16_bytes() !== Utils.contractStringToErgoTreeString(Contracts.watcherPermitContract) ||
                    Utils.bigintFromBoxValue(box.value()) !== watcherShare + ErgoConfigs.minimumErg ||
                    box.tokens().len() !== 1
                ) return false;

                // checks rwt token
                const boxToken = box.tokens().get(0)
                if (
                    boxToken.id().to_str() !== rwtToken ||
                    Utils.bigintFromI64(boxToken.amount().as_i64()) !== 1n
                ) return false;

                // add box wid to collection
                outputBoxesWIDs.push(RewardBoxes.getBoxCandidateWID(box))
            }
        }
        else { // Token payment case
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
            for (let i = 0; i < outputLength - 4; i++) {
                const box = outputBoxes.get(i)
                if (
                    box.ergo_tree().to_base16_bytes() !== Utils.contractStringToErgoTreeString(Contracts.watcherPermitContract) ||
                    Utils.bigintFromBoxValue(box.value()) !== ErgoConfigs.minimumErg ||
                    box.tokens().len() !== 2
                ) return false;

                // checks rwt and reward tokens
                const boxRwtToken = box.tokens().get(0)
                const boxRewardToken = box.tokens().get(1)
                if (
                    boxRwtToken.id().to_str() !== rwtToken ||
                    boxRewardToken.id().to_str() !== rewardTokenId ||
                    Utils.bigintFromI64(boxRwtToken.amount().as_i64()) !== 1n ||
                    Utils.bigintFromI64(boxRewardToken.amount().as_i64()) !== watcherShare
                ) return false;

                // add box wid to collection
                outputBoxesWIDs.push(RewardBoxes.getBoxCandidateWID(box))
            }
        }

        // verify if all inputs WIDs exist in output boxes
        const inputWIDs = event.WIDs.concat(commitmentBoxes.map(box => Utils.Uint8ArrayToHexString(RewardBoxes.getErgoBoxWID(box))))
        return Utils.doArraysHaveSameElements(inputWIDs, outputBoxesWIDs)
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
     * checks if input boxes contain all valid commitments and the event box
     * @param inputBoxes the transaction input boxes
     * @param eventBox the event trigger box
     * @param commitmentBoxes the event valid commitment boxes that didn't merge
     */
    verifyInputs = (inputBoxes: UnsignedInputs, eventBox: ErgoBox, commitmentBoxes: ErgoBox[]): boolean => {
        const sizeOfInputs = inputBoxes.len()
        if (inputBoxes.get(0).box_id().to_str() !== eventBox.box_id().to_str()) return false

        const inputBoxIds: string[] = []
        for (let i = 1; i < sizeOfInputs; i++)
            inputBoxIds.push(inputBoxes.get(i).box_id().to_str())

        commitmentBoxes.forEach(box => {
            if (!inputBoxIds.includes(box.box_id().to_str())) return false
        })

        return true
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
        console.log(`\t[*] step 1`)

        // calculate assets of payment box
        const watchersLen: number = event.WIDs.length + commitmentBoxes.length
        const inErgAmount: bigint = ErgoConfigs.txFee + BigInt(event.bridgeFee) + BigInt(event.networkFee)
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare: bigint = BigInt(event.networkFee)

        // calculate needed amount of assets and get input boxes
        const bankBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            inErgAmount
        )
        if (!bankBoxes.covered)
            throw new Error(`Bank boxes didn't cover needed amount of erg: ${inErgAmount.toString()}`)
        console.log(`\t[*] step 2`)

        // create the output boxes
        const outBoxes = ErgoBoxCandidates.empty()

        // event trigger box watchers
        const rwtTokenId: TokenId = eventBox.tokens().get(0).id()
        event.WIDs.forEach(wid => {
            const watcherBox = new ErgoBoxCandidateBuilder(
                Utils.boxValueFromBigint(watcherShare + ErgoConfigs.minimumErg),
                Contracts.watcherPermitContract,
                currentHeight
            )
            watcherBox.add_token(rwtTokenId, TokenAmount.from_i64(Utils.i64FromBigint(1n)))
            watcherBox.set_register_value(4, Constant.from_coll_coll_byte([Utils.hexStringToUint8Array(wid)]))
            outBoxes.add(watcherBox.build())
        })
        console.log(`\t[*] step 3.1`)

        // commitment boxes watchers
        commitmentBoxes.forEach(box => {
            const wid = RewardBoxes.getErgoBoxWID(box)
            const watcherBox = new ErgoBoxCandidateBuilder(
                Utils.boxValueFromBigint(watcherShare + ErgoConfigs.minimumErg),
                Contracts.watcherPermitContract,
                currentHeight
            )
            watcherBox.add_token(rwtTokenId, TokenAmount.from_i64(Utils.i64FromBigint(1n)))
            watcherBox.set_register_value(4, Constant.from_coll_coll_byte([wid]))
            outBoxes.add(watcherBox.build())
        })
        console.log(`\t[*] step 3.2`)

        // guardsBridgeFeeBox
        outBoxes.add(new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(guardsBridgeFeeShare),
            Utils.addressStringToContract(ErgoConfigs.bridgeFeeRepoAddress),
            currentHeight
        ).build())
        console.log(`\t[*] step 4.1`)

        // guardsNetworkFeeBox
        outBoxes.add(new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(guardsNetworkFeeShare),
            Utils.addressStringToContract(ErgoConfigs.networkFeeRepoAddress),
            currentHeight
        ).build())
        console.log(`\t[*] step 4.2`)

        // add input boxes
        const inErgoBoxes = new ErgoBoxes(eventBox)
        commitmentBoxes.forEach(box => inErgoBoxes.add(box))
        console.log(`\t[*] step 5`)

        // calculate assets of change box
        const changeBoxInfo = this.calculateBankBoxesAssets(bankBoxes.boxes, inErgoBoxes)
        const changeErgAmount: bigint = changeBoxInfo.ergs - (guardsBridgeFeeShare + guardsNetworkFeeShare) - ErgoConfigs.txFee
        const changeTokens: AssetMap = changeBoxInfo.tokens
        console.log(`\t[*] step 6.1`)

        // create the change box
        const changeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromString(changeErgAmount.toString()),
            Utils.addressToContract(this.bankAddress),
            currentHeight
        )
        Object.entries(changeTokens).forEach(([id, amount]) => {
            if (amount !== BigInt(0))
                changeBox.add_token(TokenId.from_str(id), TokenAmount.from_i64(I64.from_str(amount.toString())))
        })
        console.log(`\t[*] step 6.2`)

        // create the transaction
        const inBoxes = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        const tx = TxBuilder.new(
            inBoxes,
            outBoxes,
            currentHeight,
            Utils.boxValueFromBigint(ErgoConfigs.txFee),
            this.bankAddress,
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg)
        ).build()
        console.log(`\t[*] step 7`)

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
        console.log(`\t[*] step token 1`)

        // calculate assets of payment box
        const watchersLen: number = event.WIDs.length + commitmentBoxes.length
        const inErgAmount: bigint = 3n * ErgoConfigs.minimumErg + ErgoConfigs.txFee
        const paymentTokenId: TokenId = TokenId.from_str(event.sourceChainTokenId)
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare: bigint = BigInt(event.networkFee)

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
        console.log(`\t[*] step token 2`)

        // create the output boxes
        const outBoxes = ErgoBoxCandidates.empty()

        // event trigger box watchers
        const rwtTokenId: TokenId = eventBox.tokens().get(0).id()
        event.WIDs.forEach(wid => outBoxes.add(RewardBoxes.createWatcherPermitBox(
            currentHeight,
            rwtTokenId,
            paymentTokenId,
            watcherShare,
            Utils.hexStringToUint8Array(wid)
        )))
        console.log(`\t[*] step token 3.1`)

        // commitment boxes watchers
        commitmentBoxes.forEach(box => {
            const wid = RewardBoxes.getErgoBoxWID(box)
            outBoxes.add(RewardBoxes.createWatcherPermitBox(
                currentHeight,
                rwtTokenId,
                paymentTokenId,
                watcherShare,
                wid
            ))
        })
        console.log(`\t[*] step token 3.2`)

        // guardsBridgeFeeBox
        const guardsBridgeFeeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg),
            Utils.addressStringToContract(ErgoConfigs.bridgeFeeRepoAddress),
            currentHeight
        )
        guardsBridgeFeeBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(guardsBridgeFeeShare)))
        outBoxes.add(guardsBridgeFeeBox.build())
        console.log(`\t[*] step token 4.1`)

        // guardsNetworkFeeBox
        const guardsNetworkFeeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(ErgoConfigs.minimumErg),
            Utils.addressStringToContract(ErgoConfigs.networkFeeRepoAddress),
            currentHeight
        )
        guardsNetworkFeeBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(guardsNetworkFeeShare)))
        outBoxes.add(guardsNetworkFeeBox.build())
        console.log(`\t[*] step token 4.2`)

        // add input boxes
        const inErgoBoxes = new ErgoBoxes(eventBox)
        commitmentBoxes.forEach(box => inErgoBoxes.add(box))
        console.log(`\t[*] step token 5`)

        // calculate assets of change box
        const changeBoxInfo = this.calculateBankBoxesAssets(bankBoxes.boxes, inErgoBoxes)
        const changeErgAmount: bigint = changeBoxInfo.ergs - (2n * ErgoConfigs.minimumErg) - ErgoConfigs.txFee
        const changeTokens: AssetMap = changeBoxInfo.tokens
        changeTokens[event.sourceChainTokenId] -= BigInt(event.bridgeFee) + BigInt(event.networkFee)
        console.log(`\t[*] step token 6.1`)

        // create the change box
        const changeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromString(changeErgAmount.toString()),
            Utils.addressToContract(this.bankAddress),
            currentHeight
        )
        Object.entries(changeTokens).forEach(([id, amount]) => {
            if (amount !== BigInt(0))
                changeBox.add_token(TokenId.from_str(id), TokenAmount.from_i64(I64.from_str(amount.toString())))
        })
        console.log(`\t[*] step token 6.2`)

        // create the transaction
        const inBoxes = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        outBoxes.add(changeBox.build())
        const tx = TxBuilder.new(
            inBoxes,
            outBoxes,
            currentHeight,
            Utils.boxValueFromString(ErgoConfigs.txFee.toString()),
            this.bankAddress,
            Utils.boxValueFromString(ErgoConfigs.minimumErg.toString())
        ).build()
        console.log(`\t[*] step 7`)

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
