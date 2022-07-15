import { EventTrigger, PaymentTransaction } from "../../models/Models";
import {
    AgreementMessage,
    AgreementPayload, CandidateTransaction,
    GuardsAgreement,
    TransactionApproved
} from "./Interfaces";
import Configs from "../../helpers/Configs";
import Dialer from "../../communication/Dialer";
import Utils from "../../helpers/Utils";
import EventProcessor from "../EventProcessor";
import { scannerAction } from "../../db/models/scanner/ScannerModel";

const dialer = await Dialer.getInstance();

class TxAgreement {

    private static CHANNEL = "tx-agreement"
    private transactions: Map<string, PaymentTransaction>
    private agreedTransactions: Map<string, PaymentTransaction>
    private transactionApprovals: Map<string, AgreementPayload[]>
    private rejectedResponses: Map<string, number[]>

    constructor() {
        this.transactions = new Map()
        this.agreedTransactions = new Map()
        this.transactionApprovals = new Map()
        this.rejectedResponses = new Map()
        dialer.subscribeChannel(TxAgreement.CHANNEL, this.handleMessage)
    }

    /**
     * handles received message from tx-agreement channel
     * @param messageStr
     * @param channel
     * @param sender
     */
    handleMessage = (messageStr: string, channel: string, sender: string): void => {
        const message = JSON.parse(messageStr) as AgreementMessage;

        switch (message.type) {
            case "request": {
                const candidate = message.payload as CandidateTransaction
                const tx = JSON.parse(candidate.txJson) as PaymentTransaction
                this.processTransactionRequest(tx, candidate.guardId, candidate.signature, sender)
                break;
            }
            case "response": {
                const response = message.payload as GuardsAgreement
                this.processAgreementResponse(response.txId, response.agreed, response.guardId, response.signature)
                break;
            }
            case "approval": {
                const approval = message.payload as TransactionApproved
                this.processApprovalMessage(approval.txId, approval.guardsSignatures, sender)
                break
            }
        }
    }


    /**
     * interacts with other guards to agree on created payment transaction
     * @param tx the created payment transaction
     * @return true if enough guards agreed with transaction
     */
    startAgreementProcess = (tx: PaymentTransaction): void => {
        const creatorId = Configs.guardId
        const guardSignature = tx.signMetaData()
        const creatorAgreement = {
            "guardId": creatorId,
            "signature": guardSignature
        }

        this.transactions.set(tx.txId, tx)
        this.transactionApprovals.set(tx.txId, [creatorAgreement])

        this.broadcastTransactionRequest(tx, creatorId, guardSignature)
    }

    /**
     * sends request to all other guards to agree on a transaction
     * @param tx the created payment transaction
     * @param creatorId the guard id
     * @param guardSignature the guard signature on tx metadata
     */
    broadcastTransactionRequest = (tx: PaymentTransaction, creatorId: number, guardSignature: string): void => {
        const candidatePayload = {
            "tx": tx.toJson(),
            "guardId": creatorId,
            "signature": guardSignature
        }

        const message = {
            "type": "request",
            "payload": candidatePayload
        }

        // broadcast the transaction
        dialer.sendMessage(TxAgreement.CHANNEL, message)
    }

    /**
     * verifies the transaction sent by other guards, agree if conditions met, otherwise reject
     * @param tx the created payment transaction
     * @param creatorId id of the guard that created the transaction
     * @param signature signature of creator guard over request data (txJson and creatorId)
     * @param receiver the guard who will receive this response
     */
    processTransactionRequest = async (tx: PaymentTransaction, creatorId: number, signature: string, receiver: string): Promise<void> => {
        const eventEntity = await scannerAction.getEventById(tx.eventId)
        if (eventEntity === null) return
        const event = EventTrigger.fromEntity(eventEntity)
        if (!await EventProcessor.isEventConfirmedEnough(event)) return

        const agreementPayload: GuardsAgreement = {
            "guardId": Configs.guardId,
            "signature": "",
            "txId": tx.txId,
            "agreed": false
        }
        if (
            tx.verifyMetaDataSignature(creatorId, signature) &&
            Utils.guardTurn() === creatorId &&
            eventEntity.txId === tx.txId &&
            EventProcessor.verifyPaymentTransactionWithEvent(tx, event)
        ) {
            agreementPayload.agreed = true
            agreementPayload.signature = tx.signMetaData()
            this.agreedTransactions.set(tx.txId, tx)
            // set event tx in db
        }

        const message = {
            "type": "response",
            "payload": agreementPayload
        }

        // send response to creator guard
        dialer.sendMessage(TxAgreement.CHANNEL, message, receiver)
    }


    /**
     * verifies the agreement response sent by other guards, save their signature if they agreed
     * @param txId the payment transaction id
     * @param agreed the response (if he agreed or not)
     * @param signerId id of the guard that sent the response
     * @param signature signature of creator guard over request data (txJson and creatorId)
     */
    processAgreementResponse = async (txId: string, agreed: boolean, signerId: number, signature: string): Promise<void> => {

        /**
         * saves guard agree response with his signature in transactionApprovals
         * @param txId
         * @param guardId
         * @param signature
         */
        const pushGuardApproval = (txId: string, guardId: number, signature: string): void => {
            const txApprovals = this.transactionApprovals.get(txId)
            if (txApprovals === undefined) throw new Error(`Unexpected Error: TxId: ${txId} not found in approvals list while it was in transaction list`)

            const guardApproval = txApprovals.find(approval => approval.guardId === guardId)
            if (guardApproval === undefined) txApprovals.push({
                "guardId": guardId,
                "signature": signature
            })
            else guardApproval.signature = signature
        }

        const tx = this.transactions.get(txId)
        if (tx === undefined) return

        if (agreed) {
            if (!tx.verifyMetaDataSignature(signerId, signature)) {
                console.warn(`Received guard ${signerId} agreement for txId: ${txId} but signature didn't verify`)
                return
            }

            console.log(`Guard ${signerId} Agreed with transaction with txId: ${txId}`)
            pushGuardApproval(txId, signerId, signature)

            if (this.transactionApprovals.get(txId)!.length >= Configs.minimumAgreement) {
                console.log(`The majority of guards agreed with txId ${txId}`)

                const txApproval: TransactionApproved = {
                    "txId": txId,
                    "guardsSignatures": this.transactionApprovals.get(txId)!
                }
                const message = {
                    "type": "approval",
                    "payload": txApproval
                }
                // broadcast approval message
                dialer.sendMessage(TxAgreement.CHANNEL, message)

                await this.setTxAsApproved(txId)
            }
        }
        else {
            console.log(`Guard ${signerId} Disagreed with transaction with txId: ${tx.txId}`)
            if (this.rejectedResponses.get(txId) === undefined) this.rejectedResponses.set(txId, [])
            this.rejectedResponses.get(txId)!.push(signerId)

            if (this.rejectedResponses.get(txId)!.length > Configs.guardsLen - Configs.minimumAgreement) {
                console.log(`Lots of guards Disagreed with transaction with txId: ${tx.txId}. Aborting tx...`)
                this.transactions.delete(txId)
                if (this.transactionApprovals.get(txId) !== undefined) this.transactionApprovals.delete(txId)
                this.rejectedResponses.delete(txId)

                // TODO: remove tx data from event info in db
            }
        }
    }

    /**
     * verifies approval message sent by other guards, set tx as approved if enough guards agreed with tx
     * @param txId
     * @param guardsSignatures
     * @param sender
     */
    processApprovalMessage = async (txId: string, guardsSignatures: AgreementPayload[], sender: string): Promise<void> => {
        const tx = this.agreedTransactions.get(txId)
        if (tx === undefined) return

        if (guardsSignatures.some(approval => !tx.verifyMetaDataSignature(approval.guardId, approval.signature))) {
            console.warn(`Received approval message for txId: ${txId} from sender: ${sender} but at least one signature doesn't verify`)
            return
        }

        await this.setTxAsApproved(txId)
    }

    /**
     * sets the transaction as approved in db
     * @param txId
     */
    setTxAsApproved = async (txId: string): Promise<void> => {
        await scannerAction.setEventTxAsApproved(txId)
        this.transactions.delete(txId)
        this.transactionApprovals.delete(txId)
        if (this.rejectedResponses.get(txId) !== undefined) this.rejectedResponses.delete(txId)
    }

    /**
     * iterates over active transaction and resend its request
     */
    resendTransactionRequests = (): void => {
        const creatorId = Configs.guardId
        this.transactions.forEach(tx => {
            const guardSignature = tx.signMetaData()
            this.broadcastTransactionRequest(tx, creatorId, guardSignature)
        })
    }

    /**
     * clears all pending for agreement txs in memory
     */
    clearTransactions = (): void => {
        this.transactions.clear()
        this.transactionApprovals.clear()
        this.rejectedResponses.clear()
    }

    // TODO: clear tx in db which didn't get approved by the end of turn

}

export default TxAgreement
