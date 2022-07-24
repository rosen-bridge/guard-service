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
import EventProcessor from "./EventProcessor";

class TransactionProcessor {

    static readonly PAYMENT_TX_TYPE = "payment"
    static readonly REWARD_TX_TYPE = "reward"

    /**
     * processes all transactions in the database
     */
    static processTransactions = async (): Promise<void> => {
        const txs = await scannerAction.getActiveTransactions()

        for (const tx of txs) {
            try {
                console.log(`processing tx [${tx.txId}]`)
                switch (tx.status) {
                    case "sent": {
                        await this.processSentTx(tx)
                        break;
                    }
                    case "signed": {
                        break;
                    }
                    case "": {
                        break
                    }
                }
            }
            catch (e) {
                console.log(`An error occurred while processing tx [${tx.txId}]: ${e}`)
            }
        }
    }

    /**
     * processes the transaction
     */
    static processSentTx = async (tx: TransactionEntity): Promise<void> => {

        /**
         * process cardano transaction
         */
        const processCardanoTx = async (): Promise<void> => {
            const confirmation = await KoiosApi.getTxConfirmation(tx.txId)
            if (confirmation >= CardanoConfigs.requiredConfirmation) {
                // tx confirmed enough. proceed to next process.
                await scannerAction.setTxStatus(tx.txId, "completed")

                if (tx.type === this.PAYMENT_TX_TYPE) {
                    // set event status, to start reward distribution.
                    await scannerAction.setEventStatus(tx.event.sourceTxId, "pending-reward")
                }
                else {
                    // set event as complete
                    await scannerAction.setEventStatus(tx.event.sourceTxId, "completed")
                }
            }
            else if (confirmation === null) {
                // checking tx inputs
                await processCardanoTxInputs()
            }
            else {
                // tx is mined, but not enough confirmation. updating last check...
                const height = await BlockFrostApi.currentHeight()
                await scannerAction.updateTxLastCheck(tx.txId, height)
            }
        }

        /**
         * process ergo transaction
         */
        const processErgoTx = async (): Promise<void> => {
            const confirmation = await ExplorerApi.getTxConfirmation(tx.txId)
            if (confirmation >= ErgoConfigs.requiredConfirmation) {
                // tx confirmed enough. event is done.
                await scannerAction.setTxStatus(tx.txId, "completed")
                await scannerAction.setEventStatus(tx.event.sourceTxId, "completed")
            }
            else if (confirmation === -1) {
                // tx is not mined. checking mempool...
                if (await ExplorerApi.isTxInMempool(tx.txId)) {
                    // tx is in mempool. updating last check...
                    const height = await NodeApi.getHeight()
                    await scannerAction.updateTxLastCheck(tx.txId, height)
                }
                else {
                    // tx is not in mempool. checking inputs
                    await processErgoTxInputs()
                }
            }
            else {
                // tx is mined, but not enough confirmation. updating last check...
                const height = await NodeApi.getHeight()
                await scannerAction.updateTxLastCheck(tx.txId, height)
            }
        }

        /**
         * process cardano transaction inputs TODO
         */
        const processCardanoTxInputs = async (): Promise<void> => {
            const ergoTx = ErgoTransaction.fromJson(tx.txJson)
            const boxes = ergoTx.inputBoxes.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes))
            let valid = true
            for (const box of boxes) {
                valid = valid && await ExplorerApi.isBoxUnspentAndValid(box.box_id().to_str())
            }
            if (valid) {
                // tx is valid. resending...
                await EventProcessor.submitTransactionToChain(ergoTx, ChainsConstants.ergo)
            }
            else {
                // tx is invalid. reset status if enough blocks past.
                const height = await NodeApi.getHeight()
                if (height - tx.lastCheck >= ErgoConfigs.requiredConfirmation) {
                    await scannerAction.setTxStatus(tx.txId, "invalid")
                    if (tx.type === "payment")
                        await scannerAction.resetEventTx(tx.event.sourceTxId, "pending-payment")
                    else
                        await scannerAction.resetEventTx(tx.event.sourceTxId, "pending-reward")
                }
            }
        }

        /**
         * process ergo transaction inputs
         */
        const processErgoTxInputs = async (): Promise<void> => {
            const ergoTx = ErgoTransaction.fromJson(tx.txJson)
            const boxes = ergoTx.inputBoxes.map(boxBytes => ErgoBox.sigma_parse_bytes(boxBytes))
            let valid = true
            for (const box of boxes) {
                valid = valid && await ExplorerApi.isBoxUnspentAndValid(box.box_id().to_str())
            }
            if (valid) {
                // tx is valid. resending...
                await EventProcessor.submitTransactionToChain(ergoTx, ChainsConstants.ergo)
            }
            else {
                // tx is invalid. reset status if enough blocks past.
                const height = await NodeApi.getHeight()
                if (height - tx.lastCheck >= ErgoConfigs.requiredConfirmation) {
                    await scannerAction.setTxStatus(tx.txId, "invalid")
                    await scannerAction.resetEventTx(tx.event.sourceTxId, "pending-payment")
                }
            }
        }

        if (tx.chain === ChainsConstants.cardano) {
            await processCardanoTx()
        }
        else if (tx.chain === ChainsConstants.ergo) {
            await processErgoTx()
        }
        else throw new Error(`chain [${tx.chain}] not implemented.`)
    }

}

export default TransactionProcessor
