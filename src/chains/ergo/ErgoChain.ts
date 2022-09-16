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
import { JsonBI } from "../../network/NetworkModels";
import inputBoxes from "./boxes/InputBoxes";
import { logger } from "../../log/Logger";

class ErgoChain implements BaseChain<ReducedTransaction, ErgoTransaction> {

    lockAddress = Address.from_base58(ErgoConfigs.ergoContractConfig.lockAddress)
    lockErgoTree = ErgoUtils.addressToErgoTreeString(this.lockAddress)

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
            ErgoUtils.calculateBoxesAssets([eventBox, ...commitmentBoxes]),
            true
        )

        // get required boxes for transaction input
        const coveringBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.lockErgoTree,
            requiredAssets.ergs + ErgoConfigs.minimumErg, // required amount of Erg plus minimumErg for change box
            requiredAssets.tokens
        )

        if (!coveringBoxes.covered) {
            const Erg = (requiredAssets.ergs + ErgoConfigs.minimumErg).toString()
            const Tokens = JsonBI.stringify(requiredAssets.tokens)
            logger.error("Bank boxes didn't cover required assets", {Erg: Erg, Tokens: Tokens})
            throw Error(`Bank boxes didn't cover required assets. Erg: ${Erg}, Tokens: ${Tokens}`)
        }

        // calculate input boxes and assets
        const inBoxes = [eventBox, ...commitmentBoxes, ...coveringBoxes.boxes]
        const inBoxesAssets = ErgoUtils.calculateBoxesAssets(inBoxes)
        const inErgoBoxes = ErgoBoxes.empty()
        inBoxes.forEach(box => inErgoBoxes.add(box))

        // create change box and add to outBoxes
        outBoxes.push(OutputBoxes.createChangeBox(
            currentHeight,
            ErgoConfigs.ergoContractConfig.lockAddress,
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
            this.lockAddress
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

        logger.info("Payment Transaction for event generated", {eventId: [eventId], txId: {txId}})
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
        const rsnCoef = await InputBoxes.getRSNRatioCoef(event.targetChainTokenId)
        if (!BoxVerifications.verifyInputs(tx.inputs(), eventBox, commitmentBoxes, paymentTx.inputBoxes)) return false

        // verify number of output boxes (1 payment box + number of watchers + 2 box for guards + 1 change box + 1 tx fee box)
        const outputLength = outputBoxes.len()
        const watchersLen = event.WIDs.length + commitmentBoxes.length
        if (outputLength !== watchersLen + 5) return false

        // verify change box address
        if (outputBoxes.get(outputLength - 2).ergo_tree().to_base16_bytes() !== this.lockErgoTree) return false;

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
        const outBoxes: ErgoBoxCandidate[] = Reward.ergEventRewardBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight, paymentTokenId, ChainsConstants.ergo)
        const paymentBox = OutputBoxes.createPaymentBox(
            currentHeight,
            event.toAddress,
            paymentErgAmount,
            paymentTokenId,
            paymentTokenAmount,
        )

        return [...outBoxes, paymentBox]
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
        const outBoxes: ErgoBoxCandidate[] = Reward.tokenEventRewardBoxes(event, eventBox, commitmentBoxes, rsnCoef, currentHeight, paymentTokenId, ChainsConstants.ergo)
        const paymentBox = OutputBoxes.createPaymentBox(
            currentHeight,
            event.toAddress,
            paymentErgAmount,
            paymentTokenId,
            paymentTokenAmount,
        )

        return [...outBoxes, paymentBox]
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
                logger.info("Ergo tx signed successfully", {txId: ergoTx.txId})

            })
            .catch( async (e) => {
                logger.warn("An error occurred while requesting Multisig service to sign Ergo tx", {error: e})
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
     * @param RWTId
     */
    verifyEventWithPayment = async (event: EventTrigger, RWTId: string): Promise<boolean> => {
        const eventId = Utils.txIdToEventId(event.sourceTxId)
        // Verifying watcher RWTs
        if(RWTId !== ErgoConfigs.ergoContractConfig.RWTId) {
            logger.info("the event is not valid, event RWT is not compatible with the ergo RWT id", {eventId: eventId})
            return false
        }
        try {
            const paymentTx = await ExplorerApi.getConfirmedTx(event.sourceTxId)
            if (paymentTx) {
                const lockAddress = ErgoConfigs.ergoContractConfig.lockAddress
                const payment = paymentTx.outputs.filter((box) =>
                    lockAddress === box.address
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
                        logger.info('event is not valid,transaction token or chainId is invalid', {
                            eventId: eventId,
                            txId: event.sourceTxId
                        })
                        return false
                    }
                    // TODO: fix fromAddress when it was fixed in the watcher side
                    //  https://git.ergopool.io/ergo/rosen-bridge/watcher/-/issues/8
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
                        logger.info('event has been successfully validated', {eventId: eventId})
                        return true
                    }
                    else {
                        logger.info('event is not valid, event data does not match with lock tx', {
                            eventId: eventId,
                            txId: event.sourceTxId
                        })
                        return false
                    }
                }
                else {
                    logger.info('event is not valid, failed to extract Rosen data from lock tx', {
                        eventId: eventId,
                        txId: event.sourceTxId
                    })
                    return false
                }
            }
            else {
                logger.info('event is not valid, lock tx is not available in network', {
                    eventId: eventId,
                    txId: event.sourceTxId
                })
                return false
            }
        }
        catch (e) {
            logger.info('event validation failed', {
                eventId: eventId,
                error: e
            })
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
            logger.info('Cardano Transaction submitted', {
                response: response,
            })
        } catch (e) {
            logger.error('An error occurred while submitting Ergo transaction', {error: e.message})
        }
    }

}

export default ErgoChain
