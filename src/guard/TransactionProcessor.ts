import { scannerAction } from "../db/models/scanner/ScannerModel";
import { TransactionEntity } from "../db/entities/scanner/TransactionEntity";
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
import { PaymentTransaction } from "../models/Models";
import BaseChain from "../chains/BaseChains";

class TransactionProcessor {

    static readonly PAYMENT_TX_TYPE = "payment"
    static readonly REWARD_TX_TYPE = "reward"

    static cardanoChain = new CardanoChain()
    static ergoChain = new ErgoChain()

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
        const txs = await scannerAction.getActiveTransactions()

        for (const tx of txs) {
            try {
                switch (tx.status) {
                    case "sent": {
                        await this.processSentTx(tx)
                        break;
                    }
                    case "signed": {
                        await this.processSignedTx(tx)
                        break;
                    }
                    case "approved": {
                        await this.processApprovedTx(tx)
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
     */
    static processCardanoTx = async (tx: TransactionEntity): Promise<void> => {
        const confirmation = await KoiosApi.getTxConfirmation(tx.txId)
        if (confirmation === null) {
            // checking tx inputs
            await this.processCardanoTxInputs(tx)
        }
        else if (confirmation >= CardanoConfigs.requiredConfirmation) {
            // tx confirmed enough. proceed to next process.
            await scannerAction.setTxStatus(tx.txId, "completed")

            if (tx.type === this.PAYMENT_TX_TYPE) {
                // set event status, to start reward distribution.
                await scannerAction.setEventStatus(tx.event.sourceTxId, "pending-reward")
                console.log(`tx [${tx.txId}] is confirmed. event [${tx.event.sourceTxId}] is ready for reward distribution.`)
            }
            else {
                // set event as complete
                await scannerAction.setEventStatus(tx.event.sourceTxId, "completed")
                console.log(`tx [${tx.txId}] is confirmed. event [${tx.event.sourceTxId}] is complete.`)
            }
        }
        else {
            // tx is mined, but not enough confirmation. updating last check...
            const height = await BlockFrostApi.currentHeight()
            await scannerAction.updateTxLastCheck(tx.txId, height)
            console.log(`tx [${tx.txId}] is in confirmation process [${confirmation}/${CardanoConfigs.requiredConfirmation}].`)
        }
    }

    /**
     * process ergo transaction
     */
    static processErgoTx = async (tx: TransactionEntity): Promise<void> => {
        const confirmation = await ExplorerApi.getTxConfirmation(tx.txId)
        if (confirmation >= ErgoConfigs.requiredConfirmation) {
            // tx confirmed enough. event is done.
            await scannerAction.setTxStatus(tx.txId, "completed")
            await scannerAction.setEventStatus(tx.event.sourceTxId, "completed")
            console.log(`tx [${tx.txId}] is confirmed. event [${tx.event.sourceTxId}] is complete.`)
        }
        else if (confirmation === -1) {
            // tx is not mined. checking mempool...
            if (await ExplorerApi.isTxInMempool(tx.txId)) {
                // tx is in mempool. updating last check...
                const height = await NodeApi.getHeight()
                await scannerAction.updateTxLastCheck(tx.txId, height)
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
            await scannerAction.updateTxLastCheck(tx.txId, height)
            console.log(`tx [${tx.txId}] is in confirmation process [${confirmation}/${CardanoConfigs.requiredConfirmation}].`)
        }
    }

    /**
     * process cardano transaction inputs
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
            const height = await BlockFrostApi.currentHeight()
            if (height - tx.lastCheck >= CardanoConfigs.requiredConfirmation) {
                await scannerAction.setTxStatus(tx.txId, "invalid")
                await scannerAction.resetEventTx(tx.event.sourceTxId, "pending-payment")
                console.log(`tx [${tx.txId}] is invalid. event [${tx.event.sourceTxId}] is now waiting for payment.`)
            }
            else {
                console.log(`tx [${tx.txId}] is invalid. waiting for enough confirmation of this proposition.`)
            }
        }
    }

    /**
     * process ergo transaction inputs
     */
    static processErgoTxInputs = async (tx: TransactionEntity): Promise<void> => {
        const ergoTx = ErgoTransaction.fromJson(tx.txJson)
        const boxes = ergoTx.inputBoxes.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes))
        let valid = true
        for (const box of boxes) {
            valid = valid && await ExplorerApi.isBoxUnspentAndValid(box.box_id().to_str())
        }
        if (valid) {
            // tx is valid. resending...
            console.log(`tx [${tx.txId}] is lost but inputs are still valid. resending tx...`)
            await this.ergoChain.submitTransaction(ergoTx)
        }
        else {
            // tx is invalid. reset status if enough blocks past.
            const height = await NodeApi.getHeight()
            if (height - tx.lastCheck >= ErgoConfigs.requiredConfirmation) {
                await scannerAction.setTxStatus(tx.txId, "invalid")
                if (tx.type === "payment") {
                    await scannerAction.resetEventTx(tx.event.sourceTxId, "pending-payment")
                    console.log(`tx [${tx.txId}] is invalid. event [${tx.event.sourceTxId}] is now waiting for payment.`)
                }
                else {
                    await scannerAction.resetEventTx(tx.event.sourceTxId, "pending-reward")
                    console.log(`tx [${tx.txId}] is invalid. event [${tx.event.sourceTxId}] is now waiting for reward distribution.`)
                }
            }
            else {
                console.log(`tx [${tx.txId}] is invalid. waiting for enough confirmation of this proposition.`)
            }
        }
    }

    /**
     * sends request to sign tx
     */
    static processApprovedTx = async (tx: TransactionEntity): Promise<void> => {
        const paymentTx = PaymentTransaction.fromJson(tx.txJson)
        await this.getChainObject(tx.chain).requestToSignTransaction(paymentTx)
    }

    /**
     * submits tx to corresponding chain
     */
    static processSignedTx = async (tx: TransactionEntity): Promise<void> => {
        const paymentTx = PaymentTransaction.fromJson(tx.txJson)
        await this.getChainObject(tx.chain).submitTransaction(paymentTx)
    }

}

export default TransactionProcessor
