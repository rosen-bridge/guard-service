import {
    Address,
    BoxSelection,
    ErgoBox,
    ErgoBoxAssetsDataList,
    ErgoBoxCandidateBuilder,
    ErgoBoxCandidates,
    ErgoBoxes,
    I64,
    ReducedTransaction, Token,
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
import { JsonBI } from "../../network/NetworkModels";


class ErgoChain implements BaseChain<ReducedTransaction> {

    bankAddress = Address.from_base58(ErgoConfigs.bankAddress)
    bankErgoTree = Utils.addressToErgoTreeString(this.bankAddress)

    /**
     * generates unsigned transaction of the event from multi-sig address in ergo chain
     * @param event the event trigger model
     * @return the generated payment transaction
     */
    generateTransaction = async (event: EventTrigger): Promise<PaymentTransaction> => {
        // create the transaction
        const reducedTx: ReducedTransaction = (event.targetChainTokenId === "erg") ?
            await this.ergEventTransaction(event) :
            await this.tokenEventTransaction(event)

        // create PaymentTransaction object
        const txBytes = this.serialize(reducedTx)
        const txId = reducedTx.unsigned_tx().id().to_str()
        const eventId = event.sourceTxId
        const tx = new PaymentTransaction(txId, eventId, txBytes)

        console.log(`Payment transaction for event [${tx.eventId}] generated. TxId: ${tx.txId}`)
        return tx
    }

    /**
     * verifies the payment transaction data with the event
     *  1. checks ergoTree of all boxes except payment box and fee box
     *  2. checks amount of erg in payment box
     *  3. checks number of tokens in payment box
     *  4. checks id of token in payment box (token payment)
     *  5. checks amount of token in payment box (token payment)
     *  6. checks ergoTree of payment box
     * @param paymentTx the payment transaction
     * @param event the event trigger model
     * @return true if tx verified
     */
    verifyTransactionWithEvent = (paymentTx: PaymentTransaction, event: EventTrigger): boolean => {
        const tx = this.deserialize(paymentTx.txBytes).unsigned_tx()
        const outputBoxes = tx.output_candidates()

        // verify that all other boxes belong to bank (except last box which is fee box)
        for (let i = 1; i < outputBoxes.len() - 1; i++)
            if (outputBoxes.get(i).ergo_tree().to_base16_bytes() !== this.bankErgoTree) return false;

        // verify event conditions
        const paymentBox = outputBoxes.get(0)
        if (event.targetChainTokenId === "erg") { // Erg payment case
            const ergPaymentAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
            const targetErgoTree = Utils.addressStringToErgoTreeString(event.toAddress)
            const sizeOfTokens: number = paymentBox.tokens().len()

            return Utils.bigintFromBoxValue(paymentBox.value()) === ergPaymentAmount &&
                sizeOfTokens === 0 &&
                paymentBox.ergo_tree().to_base16_bytes() === targetErgoTree;
        } else { // Token payment case
            const ergPaymentAmount: bigint = ErgoConfigs.minimumErg
            const tokenPaymentAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
            const targetErgoTree = Utils.addressStringToErgoTreeString(event.toAddress)
            const sizeOfTokens: number = paymentBox.tokens().len()
            if (sizeOfTokens !== 1) return false

            const paymentToken: Token = paymentBox.tokens().get(0)
            return Utils.bigintFromBoxValue(paymentBox.value()) === ergPaymentAmount &&
                paymentToken.id().to_str() === event.targetChainTokenId &&
                Utils.bigintFromI64(paymentToken.amount().as_i64()) === tokenPaymentAmount &&
                paymentBox.ergo_tree().to_base16_bytes() === targetErgoTree;
        }
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
     * @return the generated payment reduced transaction
     */
    ergEventTransaction = async (event: EventTrigger): Promise<ReducedTransaction> => {
        // get network current height
        const currentHeight = await NodeApi.getHeight()

        // calculate assets of payment box
        const paymentAmount: bigint = BigInt(event.amount) - BigInt(event.bridgeFee) - BigInt(event.networkFee)
        const inErgAmount: bigint = paymentAmount + ErgoConfigs.minimumErg + ErgoConfigs.txFee

        // calculate needed amount of assets and get input boxes
        const bankBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            inErgAmount
        )
        if (!bankBoxes.covered)
            throw new Error(`Bank boxes didn't cover needed amount of erg: ${inErgAmount.toString()}`)

        // create the payment box
        const paymentBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromString(paymentAmount.toString()),
            Utils.addressStringToContract(event.toAddress),
            currentHeight
        )

        // calculate assets of change box
        const changeBoxInfo = this.calculateInputBoxesAssets(bankBoxes.boxes)
        const inErgoBoxes = changeBoxInfo.inBoxes
        let changeErgAmount: bigint = changeBoxInfo.ergs - paymentAmount - ErgoConfigs.txFee
        const changeTokens: AssetMap = changeBoxInfo.tokens

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

        // create the transaction
        const inBoxes = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        const outBoxes = new ErgoBoxCandidates(paymentBox.build())
        outBoxes.add(changeBox.build())
        const tx = TxBuilder.new(
            inBoxes,
            outBoxes,
            currentHeight,
            Utils.boxValueFromString(ErgoConfigs.txFee.toString()),
            this.bankAddress,
            Utils.boxValueFromString(ErgoConfigs.minimumErg.toString())
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
     * @return the generated payment reduced transaction
     */
    tokenEventTransaction = async (event: EventTrigger): Promise<ReducedTransaction> => {
        // get network current height
        const currentHeight = await NodeApi.getHeight()

        // calculate assets of payment box
        const inErgAmount: bigint = ErgoConfigs.minimumErg + ErgoConfigs.minimumErg + ErgoConfigs.txFee
        const paymentErgAmount: bigint = ErgoConfigs.minimumErg
        const paymentTokenId: TokenId = TokenId.from_str(event.targetChainTokenId)
        const paymentTokenAmount: bigint = BigInt(event.amount) - (BigInt(event.bridgeFee)) - (BigInt(event.networkFee))

        // calculate needed amount of assets and get input boxes
        const bankBoxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
            this.bankErgoTree,
            inErgAmount,
            {
                [event.targetChainTokenId]: paymentTokenAmount
            }
        )
        if (!bankBoxes.covered)
            throw new Error(`Bank boxes didn't cover needed amount of erg: ${inErgAmount.toString()}, or token: [id: ${event.targetChainTokenId}] amount: ${paymentTokenAmount}`)

        // create the payment box
        const paymentBox = new ErgoBoxCandidateBuilder(
            Utils.boxValueFromString(paymentErgAmount.toString()),
            Utils.addressStringToContract(event.toAddress),
            currentHeight
        )
        paymentBox.add_token(paymentTokenId, TokenAmount.from_i64(Utils.i64FromBigint(paymentTokenAmount)))

        // calculate assets of change box
        const changeBoxInfo = this.calculateInputBoxesAssets(bankBoxes.boxes)
        const inErgoBoxes = changeBoxInfo.inBoxes
        let changeErgAmount: bigint = changeBoxInfo.ergs - paymentErgAmount - ErgoConfigs.txFee
        const changeTokens: AssetMap = changeBoxInfo.tokens
        changeTokens[event.targetChainTokenId] -= paymentTokenAmount

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

        // create the transaction
        const inBoxes = new BoxSelection(inErgoBoxes, new ErgoBoxAssetsDataList())
        const outBoxes = new ErgoBoxCandidates(paymentBox.build())
        outBoxes.add(changeBox.build())
        const tx = TxBuilder.new(
            inBoxes,
            outBoxes,
            currentHeight,
            Utils.boxValueFromString(ErgoConfigs.txFee.toString()),
            this.bankAddress,
            Utils.boxValueFromString(ErgoConfigs.minimumErg.toString())
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
     */
    calculateInputBoxesAssets = (boxes: ErgoBox[]): InBoxesInfo => {
        const inErgoBoxes = ErgoBoxes.empty()
        let changeErgAmount: bigint = BigInt(0)
        const changeTokens: AssetMap = {}

        boxes.forEach(box => {
            changeErgAmount += Utils.bigintFromI64(box.value().as_i64())
            const tokenSize = box.tokens().len()
            for (let i = 0; i < tokenSize; i++) {
                const token = box.tokens().get(i)
                if (changeTokens.hasOwnProperty(token.id().to_str()))
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

export default ErgoChain
