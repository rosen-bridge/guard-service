import { dbAction } from "../db/DatabaseAction";
import { TransactionEntity } from "../db/entities/TransactionEntity";
import ChainsConstants from "../chains/ChainsConstants";
import KoiosApi from "../chains/cardano/network/KoiosApi";
import CardanoConfigs from "../chains/cardano/helpers/CardanoConfigs";
import ExplorerApi from "../chains/ergo/network/ExplorerApi";
import ErgoConfigs from "../chains/ergo/helpers/ErgoConfigs";
import BlockFrostApi from "../chains/cardano/network/BlockFrostApi";
import NodeApi from "../chains/ergo/network/NodeApi";
import ErgoTransaction from "../chains/ergo/models/ErgoTransaction";
import { ErgoBox } from "ergo-lib-wasm-nodejs";
import CardanoTransaction from "../chains/cardano/models/CardanoTransaction";
import CardanoChain from "../chains/cardano/CardanoChain";
import ErgoChain from "../chains/ergo/ErgoChain";
import { AddressUtxos, TxUtxos } from "../chains/cardano/models/Interfaces";
import Utils from "../helpers/Utils";
import { EventStatus, PaymentTransaction, TransactionStatus, TransactionTypes } from "../models/Models";
import BaseChain from "../chains/BaseChains";
import { Semaphore } from "await-semaphore";

class TransactionProcessor {

    static cardanoChain = new CardanoChain()
    static ergoChain = new ErgoChain()

    static signSemaphore = new Semaphore(1)

    /**
     * returns chain object
     * @param chain the chain name
     */
    static getChainObject = (chain: string): BaseChain<any, any> => {
        if (chain === ChainsConstants.cardano) return this.cardanoChain
        else if (chain === ChainsConstants.ergo) return this.ergoChain
        else throw new Error(`chain [${chain}] not implemented.`)
    }

    /**
     * processes all transactions in the database
     */
    static processTransactions = async (): Promise<void> => {
        console.log(`processing transactions`)
        const txs = await dbAction.getActiveTransactions()

        for (const tx of txs) {
            try {
                switch (tx.status) {
                    case TransactionStatus.sent: {
                        await this.processSentTx(tx)
                        break;
                    }
                    case TransactionStatus.signed: {
                        await this.processSignedTx(tx)
                        break;
                    }
                    case TransactionStatus.approved: {
                        await this.processApprovedTx(tx)
                        break;
                    }
                    case TransactionStatus.signFailed: {
                        await this.processSignFailedTx(tx)
                        break;
                    }
                }
            }
            catch (e) {
                console.log(`An error occurred while processing tx [${tx.txId}]: ${e}`)
            }
        }
    }

    /**
     * processes the transaction that has been sent before
     * @param tx the transaction
     */
    static processSentTx = async (tx: TransactionEntity): Promise<void> => {
        if (tx.chain === ChainsConstants.cardano) {
            await this.processCardanoTx(tx)
        }
        else if (tx.chain === ChainsConstants.ergo) {
            await this.processErgoTx(tx)
        }
        else throw new Error(`chain [${tx.chain}] not implemented.`)
    }

    /**
     * process cardano transaction
     * @param tx the transaction
     */
    static processCardanoTx = async (tx: TransactionEntity): Promise<void> => {
        const confirmation = await KoiosApi.getTxConfirmation(tx.txId)
        if (confirmation === null) {
            // check if ttl passed
            const paymentTx = CardanoTransaction.fromJson(tx.txJson)
            const cardanoTx = this.cardanoChain.deserialize(paymentTx.txBytes)
            const txTtl = cardanoTx.body().ttl()
            if (txTtl === undefined) throw Error(`for tx [${tx.txId}], TTL is undefined.`)
            const currentSlot = await BlockFrostApi.currentSlot()

            if (currentSlot > txTtl) {
                // tx is dead. reset status if enough blocks past.
                await this.resetCardanoStatus(tx)
            }
            else {
                // tx is still alive, checking tx inputs
                await this.processCardanoTxInputs(tx)
            }
        }
        else if (confirmation >= CardanoConfigs.requiredConfirmation) {
            // tx confirmed enough. proceed to next process.
            await dbAction.setTxStatus(tx.txId, TransactionStatus.completed)

            if (tx.type === TransactionTypes.payment) {
                // set event status, to start reward distribution.
                await dbAction.setEventStatus(tx.event.id, EventStatus.pendingReward)
                console.log(`tx [${tx.txId}] is confirmed. event [${tx.event.id}] is ready for reward distribution.`)
            }
            else {
                // set event as complete
                await dbAction.setEventStatus(tx.event.id, EventStatus.completed)
                console.log(`tx [${tx.txId}] is confirmed. event [${tx.event.id}] is complete.`)
            }
        }
        else {
            // tx is mined, but not enough confirmation. updating last check...
            const height = await BlockFrostApi.currentHeight()
            await dbAction.updateTxLastCheck(tx.txId, height)
            console.log(`tx [${tx.txId}] is in confirmation process [${confirmation}/${CardanoConfigs.requiredConfirmation}].`)
        }
    }

    /**
     * process ergo transaction
     * @param tx the transaction
     */
    static processErgoTx = async (tx: TransactionEntity): Promise<void> => {
        const confirmation = await ExplorerApi.getTxConfirmation(tx.txId)
        if (confirmation >= ErgoConfigs.requiredConfirmation) {
            // tx confirmed enough. event is done.
            await dbAction.setTxStatus(tx.txId, TransactionStatus.completed)
            await dbAction.setEventStatus(tx.event.id, EventStatus.completed)
            console.log(`tx [${tx.txId}] is confirmed. event [${tx.event.id}] is complete.`)
        }
        else if (confirmation === -1) {
            // tx is not mined. checking mempool...
            if (await ExplorerApi.isTxInMempool(tx.txId)) {
                // tx is in mempool. updating last check...
                const height = await NodeApi.getHeight()
                await dbAction.updateTxLastCheck(tx.txId, height)
                console.log(`tx [${tx.txId}] is in mempool.`)
            }
            else {
                // tx is not in mempool. checking inputs
                await this.processErgoTxInputs(tx)
            }
        }
        else {
            // tx is mined, but not enough confirmation. updating last check...
            const height = await NodeApi.getHeight()
            await dbAction.updateTxLastCheck(tx.txId, height)
            console.log(`tx [${tx.txId}] is in confirmation process [${confirmation}/${CardanoConfigs.requiredConfirmation}].`)
        }
    }

    /**
     * process cardano transaction inputs
     * @param tx the transaction
     */
    static processCardanoTxInputs = async (tx: TransactionEntity): Promise<void> => {
        const paymentTx = CardanoTransaction.fromJson(tx.txJson)
        const cardanoTx = this.cardanoChain.deserialize(paymentTx.txBytes)
        const boxes = cardanoTx.body().inputs()

        const sourceTxs: Map<string, TxUtxos> = new Map()
        const addressUtxos: Map<string, AddressUtxos> = new Map()

        let valid = true
        for (let i = 0; i < boxes.len(); i++) {
            const box = boxes.get(i)
            const sourceTxId = Utils.Uint8ArrayToHexString(box.transaction_id().to_bytes())
            if (!sourceTxs.has(sourceTxId)) {
                try {
                    const txUtxos = await BlockFrostApi.getTxUtxos(sourceTxId)
                    sourceTxs.set(sourceTxId, txUtxos)
                }
                catch (e) {
                    console.log(`An error occurred while fetching tx [${sourceTxId}]: ${e}`)
                    valid = false
                }
            }

            const address = sourceTxs.get(sourceTxId)!.outputs[box.index()].address
            if (!addressUtxos.has(address)) {
                const utxos = await BlockFrostApi.getAddressUtxos(address)
                addressUtxos.set(address, utxos)
            }

            const utxo = addressUtxos.get(address)!.find(utxo => utxo.tx_hash === sourceTxId && utxo.output_index === box.index())
            valid = valid && (utxo !== undefined)
        }
        if (valid) {
            // tx is valid. resending...
            console.log(`tx [${tx.txId}] is lost but inputs are still valid. resending tx...`)
            await this.cardanoChain.submitTransaction(paymentTx)
        }
        else {
            // tx is invalid. reset status if enough blocks past.
            await this.resetCardanoStatus(tx)
        }
    }

    /**
     * process ergo transaction inputs
     * @param tx the transaction
     */
    static processErgoTxInputs = async (tx: TransactionEntity): Promise<void> => {
        const ergoTx = ErgoTransaction.fromJson(tx.txJson)
        if (await this.isErgoTxInputsValid(ergoTx)) {
            // tx is valid. resending...
            console.log(`tx [${tx.txId}] is lost but inputs are still valid. resending tx...`)
            await this.ergoChain.submitTransaction(ergoTx)
        }
        else {
            // tx is invalid. reset status if enough blocks past.
            await this.resetErgoStatus(tx)
        }
    }

    /**
     * sends request to sign tx
     * @param tx the transaction
     */
    static processApprovedTx = async (tx: TransactionEntity): Promise<void> => {
        await this.signSemaphore.acquire().then(async (release) => {
            try {
                const paymentTx = PaymentTransaction.fromJson(tx.txJson)
                await this.getChainObject(tx.chain).requestToSignTransaction(paymentTx)
                release()
            }
            catch (e) {
                console.log(`Unexpected Error occurred while sending tx [${tx.txId}] to sign: ${e}`)
                release()
            }
        })
    }

    /**
     * submits tx to corresponding chain
     * @param tx the transaction
     */
    static processSignedTx = async (tx: TransactionEntity): Promise<void> => {
        const paymentTx = PaymentTransaction.fromJson(tx.txJson)
        await this.getChainObject(tx.chain).submitTransaction(paymentTx)
    }

    /**
     * resets status of event and set Cardano tx as invalid if enough blocks past from last check
     * @param tx the transaction
     */
    static resetCardanoStatus = async (tx: TransactionEntity): Promise<void> => {
        const height = await BlockFrostApi.currentHeight()
        if (height - tx.lastCheck >= CardanoConfigs.requiredConfirmation) {
            await dbAction.setTxStatus(tx.txId, TransactionStatus.invalid)
            await dbAction.resetEventTx(tx.event.id, EventStatus.pendingPayment)
            console.log(`tx [${tx.txId}] is invalid. event [${tx.event.id}] is now waiting for payment.`)
        }
        else {
            console.log(`tx [${tx.txId}] is invalid. waiting for enough confirmation of this proposition.`)
        }
    }

    /**
     * resets status of event and set Ergo tx as invalid if enough blocks past from last check
     * @param tx the transaction
     */
    static resetErgoStatus = async (tx: TransactionEntity): Promise<void> => {
        const height = await NodeApi.getHeight()
        if (height - tx.lastCheck >= ErgoConfigs.requiredConfirmation) {
            await dbAction.setTxStatus(tx.txId, TransactionStatus.invalid)
            if (tx.type === TransactionTypes.payment) {
                await dbAction.resetEventTx(tx.event.id, EventStatus.pendingPayment)
                console.log(`tx [${tx.txId}] is invalid. event [${tx.event.id}] is now waiting for payment.`)
            }
            else {
                await dbAction.resetEventTx(tx.event.id, EventStatus.pendingReward)
                console.log(`tx [${tx.txId}] is invalid. event [${tx.event.id}] is now waiting for reward distribution.`)
            }
        }
        else {
            console.log(`tx [${tx.txId}] is invalid. waiting for enough confirmation of this proposition.`)
        }
    }

    /**
     * checks if all inputs of the transaction is still unspent and valid
     * @param ergoTx
     */
    static isErgoTxInputsValid = async (ergoTx: ErgoTransaction): Promise<boolean> => {
        const boxes = ergoTx.inputBoxes.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes))
        let valid = true
        for (const box of boxes) {
            valid = valid && await ExplorerApi.isBoxUnspentAndValid(box.box_id().to_str())
        }
        return valid
    }

    /**
     * set tx as invalid if at least one input is invalid
     * @param tx the transaction
     */
    static processSignFailedTx = async (tx: TransactionEntity): Promise<void> => {
        if (tx.chain === ChainsConstants.cardano) {
            // TODO: implement this process when TSS has failure response
            throw new Error(`processSignFailedTx has no implementation for [${tx.chain}] chain.`)
        }
        else if (tx.chain === ChainsConstants.ergo) {
            const ergoTx = ErgoTransaction.fromJson(tx.txJson)
            if (await this.isErgoTxInputsValid(ergoTx)) {
                // tx is valid. ignoring till become invalid...
                console.log(`tx [${tx.txId}] failed in signing process but inputs are still valid. ignoring...`)
            }
            else {
                // tx is invalid. reset status if enough blocks past.
                await this.resetErgoStatus(tx)
            }
        }
        else throw new Error(`chain [${tx.chain}] not implemented.`)
    }

}

export default TransactionProcessor
