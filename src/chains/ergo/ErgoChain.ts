import {
    Address,
    BoxSelection, DataInput, DataInputs,
    ErgoBox,
    ErgoBoxAssetsDataList, ErgoBoxCandidate,
    ErgoBoxCandidates,
    ErgoBoxes,
    Transaction,
    ReducedTransaction,
    TxBuilder,
} from "ergo-lib-wasm-nodejs";
import { EventTrigger, PaymentTransaction, TransactionStatus, TransactionTypes } from "../../models/Models";
import BaseChain from "../BaseChains";
import ErgoConfigs from "./helpers/ErgoConfigs";
import ExplorerApi from "./network/ExplorerApi";
import ErgoUtils from "./helpers/ErgoUtils";
import NodeApi from "./network/NodeApi";
import BoxVerifications from "./boxes/BoxVerifications";
import ErgoTransaction from "./models/ErgoTransaction";
import { dbAction } from "../../db/DatabaseAction";
import InputBoxes from "./boxes/InputBoxes";
import OutputBoxes from "./boxes/OutputBoxes";
import ChainsConstants from "../ChainsConstants";
import Reward from "./Reward";
import MultiSigHandler from "../../guard/multisig/MultiSig";
import Configs from "../../helpers/Configs";
import Utils from "../../helpers/Utils";

class ErgoChain implements BaseChain<ReducedTransaction, ErgoTransaction> {

    bankAddress = Address.from_base58(ErgoConfigs.bankAddress)
    bankErgoTree = ErgoUtils.addressToErgoTreeString(Address.from_base58(ErgoConfigs.bankAddress))

    /**
     * generates unsigned transaction of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @return the generated payment transaction
     */
    generateTransaction = async (event: EventTrigger): Promise<ErgoTransaction> => {
        // get current height of network
        const currentHeight = await NodeApi.getHeight()

        // get eventBox and remaining valid commitments
        const eventBox: ErgoBox = await InputBoxes.getEventBox(event)
        const commitmentBoxes: ErgoBox[] = await InputBoxes.getEventValidCommitments(event)

        const rsnCoef = await InputBoxes.getRSNRatioCoef(event.targetChainTokenId)

        // create transaction output boxes
        const outBoxes = (event.targetChainTokenId === ChainsConstants.ergoNativeAsset) ?
            this.ergEventOutBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight) :
            this.tokenEventOutBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight)

        // calculate required assets
        const outBoxesAssets = ErgoUtils.calculateBoxesAssets(outBoxes)
        const requiredAssets = ErgoUtils.reduceUsedAssets(
            outBoxesAssets,
            ErgoUtils.calculateBoxesAssets([eventBox, ...commitmentBoxes])
        )

        // get required boxes for transaction input
        const coveringBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            requiredAssets.ergs + ErgoConfigs.minimumErg, // required amount of Erg plus minimumErg for change box
            requiredAssets.tokens
        )

        if (!coveringBoxes.covered)
            throw Error(`Bank boxes didn't cover required amount of Erg: ${requiredAssets.ergs.toString()}`)

        // calculate input boxes and assets
        const inBoxes = [eventBox, ...commitmentBoxes, ...coveringBoxes.boxes]
        const inBoxesAssets = ErgoUtils.calculateBoxesAssets(inBoxes)
        const inErgoBoxes = ErgoBoxes.empty()
        inBoxes.forEach(box => inErgoBoxes.add(box))

        // create change box and add to outBoxes
        outBoxes.push(OutputBoxes.createChangeBox(
            currentHeight,
            ErgoConfigs.bankAddress,
            inBoxesAssets,
            outBoxesAssets,
            ErgoConfigs.txFee
        ))

        // get guards info box
        const guardInfoBox = await InputBoxes.getGuardsInfoBox()

        // create the box arguments in tx builder
        const inBoxSelection = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        const outBoxCandidates = ErgoBoxCandidates.empty()
        outBoxes.forEach(box => outBoxCandidates.add(box))
        const dataInputs = new DataInputs()
        dataInputs.add(new DataInput(guardInfoBox.box_id()))

        // create the transaction
        const txCandidate = TxBuilder.new(
            inBoxSelection,
            outBoxCandidates,
            currentHeight,
            ErgoUtils.boxValueFromBigint(ErgoConfigs.txFee),
            this.bankAddress
        )
        txCandidate.set_data_inputs(dataInputs)
        const tx = txCandidate.build()

        // create ReducedTransaction object
        const ctx = await NodeApi.getErgoStateContext()
        const reducedTx = ReducedTransaction.from_unsigned_tx(
            tx,
            inErgoBoxes,
            new ErgoBoxes(guardInfoBox),
            ctx
        )

        // create PaymentTransaction object
        const txBytes = this.serialize(reducedTx)
        const txId = reducedTx.unsigned_tx().id().to_str()
        const eventId = event.getId()
        const ergoTx = new ErgoTransaction(
            txId,
            eventId,
            txBytes,
            inBoxes.map(box => box.sigma_serialize_bytes()),
            [guardInfoBox].map(box => box.sigma_serialize_bytes()),
            TransactionTypes.payment
        )

        console.log(`Payment transaction for event [${eventId}] generated. TxId: ${txId}`)
        return ergoTx
    }

    /**
     * verifies the payment transaction data with the event
     *  1. checks number of output boxes
     *  2. checks change box ergoTree
     *  3. checks assets, contracts and R4 of output boxes (expect last two) are same as the one we generated
     *  4. checks transaction fee (last box erg value)
     *  5. checks assets of inputs are same as assets of output (no token burned)
     * @param paymentTx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent = async (paymentTx: ErgoTransaction, event: EventTrigger): Promise<boolean> => {

        const tx = this.deserialize(paymentTx.txBytes).unsigned_tx()
        const outputBoxes = tx.output_candidates()

        // get current height of network (not important, just for creation of expected boxes)
        const currentHeight = await NodeApi.getHeight()

        // get eventBox and remaining valid commitments
        const eventBox: ErgoBox = await InputBoxes.getEventBox(event)
        const commitmentBoxes: ErgoBox[] = await InputBoxes.getEventValidCommitments(event)
        const rsnCoef = await InputBoxes.getRSNRatioCoef(event.sourceChainTokenId)
        if (!BoxVerifications.verifyInputs(tx.inputs(), eventBox, commitmentBoxes, paymentTx.inputBoxes)) return false

        // verify number of output boxes (1 payment box + number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
        const outputLength = outputBoxes.len()
        const watchersLen = event.WIDs.length + commitmentBoxes.length
        if (outputLength !== watchersLen + 5) return false

        // verify change box address
        if (outputBoxes.get(outputLength - 2).ergo_tree().to_base16_bytes() !== this.bankErgoTree) return false;

        // verify payment box + reward boxes
        const outBoxes = (event.targetChainTokenId === ChainsConstants.ergoNativeAsset) ?
            this.ergEventOutBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight) :
            this.tokenEventOutBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight)

        const rewardBoxes: ErgoBoxCandidate[] = []
        for (let i = 0; i < watchersLen + 3; i++) // 1 payment box + watchers + 2 box for guards
            rewardBoxes.push(outputBoxes.get(i))

        // verify guards boxes and watcher permit boxes conditions
        if (!BoxVerifications.verifyOutputBoxesList(
            rewardBoxes.sort(InputBoxes.compareTwoBoxCandidate),
            outBoxes.sort(InputBoxes.compareTwoBoxCandidate)
        )) return false

        // verify tx fee
        if (ErgoUtils.bigintFromBoxValue(outputBoxes.get(outputLength - 1).value()) !== ErgoConfigs.txFee) return false

        // verify no token burned
        return BoxVerifications.verifyNoTokenBurned(paymentTx.inputBoxes, outputBoxes)
    }

    /**
     * converts the transaction model in the chain to bytearray
     * @param tx the transaction model in the chain library
     * @return bytearray representation of the transaction
     */
    serialize = (tx: ReducedTransaction | Transaction): Uint8Array => {
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
     * converts the signed transaction model in the chain to bytearray
     * @param tx the transaction model in the chain library
     * @return bytearray representation of the transaction
     */
    signedSerialize = (tx: Transaction): Uint8Array => {
        return tx.sigma_serialize_bytes()
    }

    /**
     * converts bytearray representation of the signed transaction to the transaction model in the chain
     * @param txBytes bytearray representation of the transaction
     * @return the transaction model in the chain library
     */
    signedDeserialize = (txBytes: Uint8Array): Transaction => {
        return Transaction.sigma_parse_bytes(txBytes)
    }

    /**
     * generates unsigned transaction (to pay Erg) payment and reward of the event from multi-sig address in ergo chain
     * generates outputs of payment and reward distribution tx for an Erg-Payment event in ergo chain
     * @param event the event trigger model
     * @param eventBox the event trigger box
     * @param commitmentBoxes the not-merged valid commitment boxes for the event
     * @param rsnCoef rsn fee ratio
     * @param currentHeight current height of blockchain
     * @return the generated reward reduced transaction
     */
    ergEventOutBoxes = (
        event: EventTrigger,
        eventBox: ErgoBox,
        commitmentBoxes: ErgoBox[],
        rsnCoef: [bigint, bigint],
        currentHeight: number
    ): ErgoBoxCandidate[] => {

        // calculate assets of payemnt box
        const paymentErgAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
        const paymentTokenAmount = 0n
        const paymentTokenId = event.targetChainTokenId

        // create output boxes
        const outBoxes: ErgoBoxCandidate[] = Reward.ergEventRewardBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight, paymentTokenId)
        const paymentBox = OutputBoxes.createPaymentBox(
            currentHeight,
            event.toAddress,
            paymentErgAmount,
            paymentTokenId,
            paymentTokenAmount,
        )

        return [paymentBox, ...outBoxes]
    }


    /**
     * generates outputs of payment and reward distribution tx for a Token-Payment event in ergo chain
     * @param event the event trigger model
     * @param eventBox the event trigger box
     * @param commitmentBoxes the not-merged valid commitment boxes for the event
     * @param rsnCoef rsn fee ratio
     * @param currentHeight current height of blockchain
     * @return the generated reward reduced transaction
     */
    tokenEventOutBoxes = (
        event: EventTrigger,
        eventBox: ErgoBox,
        commitmentBoxes: ErgoBox[],
        rsnCoef: [bigint, bigint],
        currentHeight: number
    ): ErgoBoxCandidate[] => {

        // calculate assets of payemnt box
        const paymentErgAmount: bigint = ErgoConfigs.minimumErg
        const paymentTokenAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
        const paymentTokenId = event.targetChainTokenId

        // create output boxes
        const outBoxes: ErgoBoxCandidate[] = Reward.tokenEventRewardBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight, paymentTokenId)
        const paymentBox = OutputBoxes.createPaymentBox(
            currentHeight,
            event.toAddress,
            paymentErgAmount,
            paymentTokenId,
            paymentTokenAmount,
        )

        return [paymentBox, ...outBoxes]
    }

    /**
     * requests Multisig service to sign an ergo transaction
     * @param paymentTx the transaction
     */
    requestToSignTransaction = async (paymentTx: PaymentTransaction): Promise<void> => {
        const tx = this.deserialize(paymentTx.txBytes)
        const ergoTx = paymentTx as ErgoTransaction
        const txInputs = ergoTx.inputBoxes.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes))
        const txDataInputs = ergoTx.dataInputs.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes))

        // change tx status to inSign
        await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.inSign)

        // send tx to sign
        MultiSigHandler.getInstance(
            Configs.guardsPublicKeys,
            Configs.guardSecret
        ).sign(tx, ErgoConfigs.requiredSigns, txInputs, txDataInputs)
            .then( async (signedTx) => {
                const inputBoxes = ErgoBoxes.empty()
                txInputs.forEach(box => inputBoxes.add(box))

                // update database
                const signedPaymentTx = new ErgoTransaction(
                    ergoTx.txId,
                    ergoTx.eventId,
                    this.signedSerialize(signedTx),
                    ergoTx.inputBoxes,
                    ergoTx.dataInputs,
                    ergoTx.txType
                )
                await dbAction.updateWithSignedTx(
                    ergoTx.txId,
                    signedPaymentTx.toJson()
                )
                console.log(`Ergo tx [${ergoTx.txId}] signed successfully`)

            })
            .catch( async (e) => {
                console.log(`An error occurred while requesting Multisig service to sign Ergo tx: ${e}`)
                await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.signFailed)
            })
    }

    /**
     * verified the event payment in the Ergo
     * conditions that checks:
     *  1- having atLeast 1 asset in the first output of the transaction
     *  2- the asset should be listed on the tokenMap config
     *  3- R4 should have length at least
     * @param event
     */
    verifyEventWithPayment = async (event: EventTrigger): Promise<boolean> => {
        const eventId = Utils.txIdToEventId(event.sourceTxId)
        try {
            const paymentTx = await ExplorerApi.getConfirmedTx(event.sourceTxId)
            if (paymentTx) {
                const payment = paymentTx.outputs.filter((box) =>
                    ErgoConfigs.lockAddress === box.address
                ).map(box => ErgoUtils.getRosenData(box, event.sourceChainTokenId)).filter(box => box !== undefined)[0]
                if (payment) {
                    const token = Configs.tokenMap.search(
                        ChainsConstants.ergo,
                        {
                            tokenID: event.sourceChainTokenId
                        })
                    let targetTokenId
                    try {
                        targetTokenId = Configs.tokenMap.getID(token[0], event.toChain)
                    }
                    catch (e) {
                        console.log(`event [${eventId}] is not valid, tx [${event.sourceTxId}] token or chainId is invalid`)
                        return false
                    }
                    // TODO: fix fromAddress when it was fixed in the watcher side
                    const inputAddress = "fromAddress"
                    if (
                        event.fromChain == ChainsConstants.ergo &&
                        event.toChain == payment.toChain &&
                        event.networkFee == payment.networkFee &&
                        event.bridgeFee == payment.bridgeFee &&
                        event.amount == payment.amount &&
                        event.sourceChainTokenId == payment.tokenId &&
                        event.targetChainTokenId == targetTokenId &&
                        event.sourceBlockId == payment.blockId &&
                        event.toAddress == payment.toAddress &&
                        event.fromAddress == inputAddress
                    ) {
                        console.log(`event [${eventId}] has been successfully validated`)
                        return true
                    }
                    else {
                        console.log(`event [${eventId}] is not valid, event data does not match with lock tx [${event.sourceTxId}]`)
                        return false
                    }
                }
                else {
                    console.log(`event [${eventId}] is not valid, failed to extract Rosen data from lock tx [${event.sourceTxId}]`)
                    return false
                }
            }
            else {
                console.log(`event [${eventId}] is not valid, lock tx [${event.sourceTxId}] is not available in network`)
                return false
            }
        }
        catch (e) {
            console.log(`event [${eventId}] validation failed with this error: [${e}]`)
            return false
        }
    }

    /**
     * submit an ergo transaction to network
     * @param paymentTx the payment transaction
     */
    submitTransaction = async (paymentTx: PaymentTransaction): Promise<void> => {
        const tx = this.signedDeserialize(paymentTx.txBytes)
        try {
            await dbAction.setTxStatus(paymentTx.txId, TransactionStatus.sent)
            const response = await NodeApi.sendTx(tx.to_json())
            console.log(`Cardano Transaction submitted. txId: ${response}`)
        } catch (e) {
            console.log(`An error occurred while submitting Ergo transaction: ${e.message}`)
        }
    }

}

export default ErgoChain
