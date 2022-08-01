import {
    Address,
    BoxSelection,
    ErgoBox,
    ErgoBoxAssetsDataList, ErgoBoxCandidate,
    ErgoBoxCandidateBuilder,
    ErgoBoxCandidates,
    ErgoBoxes,
    I64,
    ReducedTransaction, Token,
    TokenAmount,
    TokenId,
    TxBuilder, UnsignedTransaction
} from "ergo-lib-wasm-nodejs";
import { EventTrigger, PaymentTransaction, TransactionStatus, TransactionTypes } from "../../models/Models";
import BaseChain from "../BaseChains";
import ErgoConfigs from "./helpers/ErgoConfigs";
import ExplorerApi from "./network/ExplorerApi";
import Utils from "./helpers/Utils";
import NodeApi from "./network/NodeApi";
import { AssetMap, InBoxesInfo } from "./models/Interfaces";
import RewardBoxes from "./helpers/RewardBoxes";
import Contracts from "../../contracts/Contracts";
import Configs from "../../helpers/Configs";
import ErgoTransaction from "./models/ErgoTransaction";
import { scannerAction } from "../../db/models/scanner/ScannerModel";

class ErgoChain implements BaseChain<ReducedTransaction, ErgoTransaction> {

    bankAddress = Address.from_base58(ErgoConfigs.bankAddress)
    bankErgoTree = Utils.addressToErgoTreeString(this.bankAddress)

    /**
     * generates unsigned transaction of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @return the generated payment transaction
     */
    generateTransaction = async (event: EventTrigger): Promise<ErgoTransaction> => {
        // get eventBox and remaining valid commitments
        const eventBox: ErgoBox = RewardBoxes.getEventBox(event)
        const commitmentBoxes: ErgoBox[] = RewardBoxes.getEventValidCommitments(event)

        // create the transaction
        const eventTxData = (event.targetChainTokenId === "erg") ?
            await this.ergEventTransaction(event, eventBox, commitmentBoxes) :
            await this.tokenEventTransaction(event, eventBox, commitmentBoxes)

        // create ReducedTransaction object
        const ctx = await NodeApi.getErgoStateContext()
        const reducedTx = ReducedTransaction.from_unsigned_tx(
            eventTxData[0],
            eventTxData[1],
            ErgoBoxes.empty(),
            ctx
        )

        // parse tx input boxes
        const inBoxes: Uint8Array[] = []
        const inBoxesLen = eventTxData[1].len()
        for (let i = 0; i < inBoxesLen; i++)
            inBoxes.push(eventTxData[1].get(i).sigma_serialize_bytes())

        // create PaymentTransaction object
        const txBytes = this.serialize(reducedTx)
        const txId = reducedTx.unsigned_tx().id().to_str()
        const eventId = event.sourceTxId
        const tx = new ErgoTransaction(txId, eventId, txBytes, inBoxes, TransactionTypes.payment)

        console.log(`Payment transaction for event [${tx.eventId}] generated. TxId: ${tx.txId}`)
        return tx
    }

    /**
     * verifies the payment transaction data with the event
     *  1. checks ergoTree of all boxes
     *  2. checks amount of erg in payment box
     *  3. checks number of tokens in payment box
     *  4. checks id of token in payment box (token payment)
     *  5. checks amount of token in payment box (token payment)
     *  6. checks number of tokens in watcher and guards boxes
     *  7. checks rwt tokens of watchers
     *  8. checks ergoTree of payment box
     *  9. checks if input boxes contains all valid commitment boxes and first input box is the event box
     *  10. checks id of token in watcher and guards boxes (token payment)
     *  11. checks amount of token in watcher and guards boxes (token payment)
     *  12. checks if output boxes contains all WIDs in input boxes
     * @param paymentTx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent = (paymentTx: ErgoTransaction, event: EventTrigger): boolean => {

        /**
         * method to verify payment box contract
         */
        const verifyPaymentBoxErgoTree = (box: ErgoBoxCandidate, address: string): boolean => {
            return box.ergo_tree().to_base16_bytes() === Utils.addressStringToErgoTreeString(address)
        }

        /**
         * method to verify transaction conditions where it pays erg
         */
        const verifyErgPayment = (): boolean => {
            const ergPaymentAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
            const sizeOfTokens: number = paymentBox.tokens().len()

            return Utils.bigintFromBoxValue(paymentBox.value()) === ergPaymentAmount &&
                sizeOfTokens === 0 &&
                verifyPaymentBoxErgoTree(paymentBox, event.toAddress);
        }

        /**
         * method to verify transaction conditions where it pays token
         */
        const verifyTokenPayment = (): boolean => {
            const ergPaymentAmount: bigint = ErgoConfigs.minimumErg
            const tokenPaymentAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
            const sizeOfTokens: number = paymentBox.tokens().len()
            if (sizeOfTokens !== 1) return false

            const paymentToken: Token = paymentBox.tokens().get(0)
            return Utils.bigintFromBoxValue(paymentBox.value()) === ergPaymentAmount &&
                paymentToken.id().to_str() === event.targetChainTokenId &&
                Utils.bigintFromI64(paymentToken.amount().as_i64()) === tokenPaymentAmount &&
                verifyPaymentBoxErgoTree(paymentBox, event.toAddress);
        }

        /**
         * method to verify watcher permit box contract
         */
        const verifyWatcherPermitBoxErgoTree = (box: ErgoBoxCandidate): boolean => {
            return box.ergo_tree().to_base16_bytes() === Contracts.watcherPermitErgoTree
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
            for (let i = 1; i <= watchersLen; i++) {
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
            const rewardTokenId = event.targetChainTokenId
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
            for (let i = 1; i <= watchersLen; i++) {
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

        // verify guards and change boxes ergoTree
        const outputLength = outputBoxes.len()
        const watchersLen = event.WIDs.length + commitmentBoxes.length
        const paymentBox = outputBoxes.get(0)
        const guardsBridgeFeeBox = outputBoxes.get(1 + watchersLen)
        const guardsNetworkFeeBox = outputBoxes.get(1 + watchersLen + 1)
        if (
            guardsBridgeFeeBox.ergo_tree().to_base16_bytes() !== Utils.addressStringToErgoTreeString(ErgoConfigs.bridgeFeeRepoAddress) ||
            guardsNetworkFeeBox.ergo_tree().to_base16_bytes() !== Utils.addressStringToErgoTreeString(ErgoConfigs.networkFeeRepoAddress) ||
            outputBoxes.get(outputLength - 2).ergo_tree().to_base16_bytes() !== this.bankErgoTree
        ) return false;

        // verify that all other boxes belong to bank (except last box which is fee box)
        for (let i = 1 + watchersLen + 2; i < outputLength - 1; i++)
            if (outputBoxes.get(i).ergo_tree().to_base16_bytes() !== this.bankErgoTree) return false;

        // verify event condition
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare = BigInt(event.networkFee)

        const rwtToken = Configs.ergoRWT
        const outputBoxesWIDs: string[] = []

        if (event.targetChainTokenId === "erg") {
            if (
                !verifyErgPayment() ||
                !verifyErgDistribution()
            ) return false
        }
        else {
            if (
                !verifyTokenPayment() ||
                !verifyTokenDistribution()
            ) return false
        }

        // verify if all inputs WIDs exist in output boxes
        const inputWIDs = event.WIDs.concat(commitmentBoxes.map(box => Utils.Uint8ArrayToHexString(RewardBoxes.getErgoBoxWID(box))))
        return Utils.doArraysHaveSameStrings(inputWIDs, outputBoxesWIDs) && RewardBoxes.verifyNoTokenBurned(tx.inputs(), paymentTx.inputBoxes, outputBoxes)
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
     * generates unsigned transaction (to pay Erg) payment and reward of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @param eventBox the event trigger box
     * @param commitmentBoxes the not-merged valid commitment boxes for the event
     * @return the generated reward reduced transaction
     */
    ergEventTransaction = async (event: EventTrigger, eventBox: ErgoBox, commitmentBoxes: ErgoBox[]): Promise<[UnsignedTransaction, ErgoBoxes]> => {
        // get network current height
        const currentHeight = await NodeApi.getHeight()

        // calculate assets of payment box
        const watchersLen: number = event.WIDs.length + commitmentBoxes.length
        const paymentAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
        const inErgAmount: bigint = ErgoConfigs.txFee + BigInt(event.amount)
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

        // create the payment box
        const paymentBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(paymentAmount),
            Utils.addressStringToContract(event.toAddress),
            currentHeight
        )
        outBoxes.add(paymentBox.build())

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
        const changeErgAmount: bigint = changeBoxInfo.ergs - BigInt(event.amount) - ErgoConfigs.txFee
        const changeTokens: AssetMap = changeBoxInfo.tokens

        // create the change box
        const changeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(changeErgAmount),
            Utils.addressToContract(this.bankAddress),
            currentHeight
        )
        Object.entries(changeTokens).forEach(([id, amount]) => {
            if (amount > BigInt(0))
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

        return [tx, inErgoBoxes]
    }


    /**
     * generates unsigned transaction (to pay token) of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @param eventBox the event trigger box
     * @param commitmentBoxes the not-merged valid commitment boxes for the event
     * @return the generated reward reduced transaction
     */
    tokenEventTransaction = async (event: EventTrigger, eventBox: ErgoBox, commitmentBoxes: ErgoBox[]): Promise<[UnsignedTransaction, ErgoBoxes]> => {
        // get network current height
        const currentHeight = await NodeApi.getHeight()

        // calculate assets of payment box
        const inErgAmount: bigint = 4n * ErgoConfigs.minimumErg + ErgoConfigs.txFee // 4 minimum erg for payment box, two guards boxes and change box
        const paymentErgAmount: bigint = ErgoConfigs.minimumErg
        const paymentTokenId: TokenId = TokenId.from_str(event.targetChainTokenId)
        const paymentTokenAmount: bigint = BigInt(event.amount) - (BigInt(event.bridgeFee)) - (BigInt(event.networkFee))
        const watchersLen: number = event.WIDs.length + commitmentBoxes.length
        const watcherShare: bigint = BigInt(event.bridgeFee) * ErgoConfigs.watchersSharePercent / 100n / BigInt(watchersLen)
        const guardsBridgeFeeShare: bigint = BigInt(event.bridgeFee) - (BigInt(watchersLen) * watcherShare)
        const guardsNetworkFeeShare = BigInt(event.networkFee)

        // calculate needed amount of assets and get input boxes
        const bankBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            inErgAmount,
            {
                [event.targetChainTokenId]: BigInt(event.amount)
            }
        )
        if (!bankBoxes.covered)
            throw new Error(`Bank boxes didn't cover needed amount of erg: ${inErgAmount.toString()}, or token: [id: ${event.targetChainTokenId}] amount: ${BigInt(event.amount)}`)

        // create the output boxes
        const outBoxes = ErgoBoxCandidates.empty()

        // create the payment box
        const paymentBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(paymentErgAmount),
            Utils.addressStringToContract(event.toAddress),
            currentHeight
        )
        paymentBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(paymentTokenAmount)))
        outBoxes.add(paymentBox.build())

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
        const changeErgAmount: bigint = changeBoxInfo.ergs - (3n * ErgoConfigs.minimumErg) - ErgoConfigs.txFee // reduce other boxes ergs (payment box and two guards boxes)
        const changeTokens: AssetMap = changeBoxInfo.tokens
        changeTokens[event.targetChainTokenId] -= BigInt(event.amount)

        // create the change box
        const changeBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromBigint(changeErgAmount),
            Utils.addressToContract(this.bankAddress),
            currentHeight
        )
        Object.entries(changeTokens).forEach(([id, amount]) => {
            if (amount > BigInt(0))
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

        return [tx, inErgoBoxes]
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

    /**
     * requests Multisig service to sign an ergo transaction
     * @param paymentTx the transaction
     */
    requestToSignTransaction = async (paymentTx: PaymentTransaction): Promise<void> => {
        const tx = this.deserialize(paymentTx.txBytes)
        try {
            // TODO: implement this (Integration with Multisig service).
        }
        catch (e) {
            console.log(`An error occurred while requesting Multisig service to sign Ergo tx: ${e.message}`)
        }
    }

    /**
     * submit an ergo transaction to network
     * @param paymentTx the payment transaction
     */
    submitTransaction = async (paymentTx: PaymentTransaction): Promise<void> => {
        const tx = this.deserialize(paymentTx.txBytes)
        try {
            await scannerAction.setTxStatus(paymentTx.txId, TransactionStatus.sent)
            const response = await NodeApi.sendTx(tx.unsigned_tx().to_json())
            console.log(`Cardano Transaction submitted. txId: ${response}`)
        }
        catch (e) {
            console.log(`An error occurred while submitting Ergo transaction: ${e.message}`)
        }
    }

}

export default ErgoChain
