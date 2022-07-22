import { scannerAction } from "../db/models/scanner/ScannerModel";
import { EventTrigger, PaymentTransaction } from "../models/Models";
import { txAgreement } from "./agreement/TxAgreement";
import { CandidateTransaction, GuardsAgreement, TransactionApproved } from "./agreement/Interfaces";
import { TransactionEntity } from "../db/entities/scanner/TransactionEntity";
import ChainsConstants from "../chains/ChainsConstants";
import KoiosApi from "../chains/cardano/network/KoiosApi";
import CardanoConfigs from "../chains/cardano/helpers/CardanoConfigs";
import ExplorerApi from "../chains/ergo/network/ExplorerApi";
import ErgoConfigs from "../chains/ergo/helpers/ErgoConfigs";

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
                        const response = message.payload as GuardsAgreement
                        await this.processAgreementResponse(response.txId, response.agreed, response.guardId, response.signature)
                        break;
                    }
                    case "": {
                        const approval = message.payload as TransactionApproved
                        const tx = JSON.parse(approval.txJson) as PaymentTransaction
                        await this.processApprovalMessage(tx, approval.guardsSignatures, sender)
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
     *  1.
     */
    static processSentTx = async (tx: TransactionEntity): Promise<void> => {
        if (tx.chain === ChainsConstants.cardano) {
            const confirmation = await KoiosApi.getTxConfirmation(tx.txId)
            if (confirmation >= CardanoConfigs.requiredConfirmation) {
                await scannerAction.setTxAsCompleted(tx.txId)

                if (tx.type === this.PAYMENT_TX_TYPE) {
                    // TODO: update event id to start reward distribution
                }
                else {
                    // TODO: set event as complete
                }
            }
            else {
                // TODO: get current height, update lastCheck
            }
        }
        else if (tx.chain === ChainsConstants.ergo) {
            const confirmation = await ExplorerApi.getTxConfirmation(tx.txId)
            if (confirmation >= ErgoConfigs.requiredConfirmation) {
                await scannerAction.setTxAsCompleted(tx.txId)
                // TODO: set event as complete
            }
            else if (confirmation === 0) {
                // TODO: check if tx is in mempool
            }
            else {
                // TODO: get current height, update lastCheck
            }
        }
        else throw new Error(`chain [${tx.chain}] not implemented.`)
    }

}

export default TransactionProcessor
