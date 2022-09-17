import {
    EventStatus,
    EventTrigger,
    PaymentTransaction,
    TransactionStatus,
    TransactionTypes
} from "../../models/Models";
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
import { dbAction } from "../../db/DatabaseAction";
import TransactionProcessor from "../TransactionProcessor";
import { txJsonParser } from "../../chains/TxJsonParser";
import { logger } from "../../log/Logger";

const dialer = await Dialer.getInstance();

class TxAgreement {

    protected static CHANNEL = "tx-agreement"
    protected transactions: Map<string, PaymentTransaction>
    protected eventAgreedTransactions: Map<string, string>
    protected transactionApprovals: Map<string, AgreementPayload[]>

    constructor() {
        this.transactions = new Map()
        this.eventAgreedTransactions = new Map()
        this.transactionApprovals = new Map()
        dialer.subscribeChannel(TxAgreement.CHANNEL, this.handleMessage)
    }

    /**
     * handles received message from tx-agreement channel
     * @param messageStr
     * @param channel
     * @param sender
     */
    handleMessage = async (messageStr: string, channel: string, sender: string): Promise<void> => {
        const message = JSON.parse(messageStr) as AgreementMessage;

        switch (message.type) {
            case "request": {
                const candidate = message.payload as CandidateTransaction
                const tx = txJsonParser(candidate.txJson)
                await this.processTransactionRequest(tx, candidate.guardId, candidate.signature, sender)
                break;
            }
            case "response": {
                const response = message.payload as GuardsAgreement
                await this.processAgreementResponse(response.txId, response.agreed, response.guardId, response.signature)
                break;
            }
            case "approval": {
                const approval = message.payload as TransactionApproved
                const tx = txJsonParser(approval.txJson)
                await this.processApprovalMessage(tx, approval.guardsSignatures, sender)
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
            "txJson": tx.toJson(),
            "guardId": creatorId,
            "signature": guardSignature
        }

        const message = JSON.stringify({
            "type": "request",
            "payload": candidatePayload
        })

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
        const eventEntity = await dbAction.getEventById(tx.eventId)
        if (eventEntity === null) {
            logger.info(`Received tx [${tx.txId}] for event [${tx.eventId}] but event not found`)
            return
        }
        const event = EventTrigger.fromConfirmedEntity(eventEntity)
        if (!await EventProcessor.isEventConfirmedEnough(event)) {
            logger.info(`Received tx [${tx.txId}] for event but event [${tx.eventId}] is not confirmed enough`)
            return
        }
        if (
            await EventProcessor.verifyEvent(event) &&
            tx.verifyMetaDataSignature(creatorId, signature) &&
            Utils.guardTurn() === creatorId &&
            !(await this.isEventHasDifferentTransaction(tx.eventId, tx.txId, tx.txType)) &&
            (await EventProcessor.verifyPaymentTransactionWithEvent(tx, event))
        ) {
            this.transactions.set(tx.txId, tx)
            this.eventAgreedTransactions.set(tx.eventId, tx.txId)
            logger.info(`Agreed with tx [${tx.txId}] for event [${tx.eventId}]`)

            const agreementPayload: GuardsAgreement = {
                "guardId": Configs.guardId,
                "signature": tx.signMetaData(),
                "txId": tx.txId,
                "agreed": true
            }

            const message = JSON.stringify({
                "type": "response",
                "payload": agreementPayload
            })

            // send response to creator guard
            dialer.sendMessage(TxAgreement.CHANNEL, message, receiver)
        }
        else
            logger.info(`Rejected tx [${tx.txId}] for event [${tx.eventId}]`)
    }

    /**
     * checks if another transaction exists for this event that is still valid
     * @param eventId the event trigger id
     * @param txId current transaction id
     * @param txType type of the transaction
     */
    isEventHasDifferentTransaction = async (eventId: string, txId: string, txType: string): Promise<boolean> => {
        if (this.eventAgreedTransactions.has(eventId) && this.eventAgreedTransactions.get(eventId) !== txId)
            return true

        const eventTxs = await dbAction.getEventTxsByType(eventId, txType)
        return eventTxs.find(tx => tx.status != TransactionStatus.invalid) !== undefined;
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
            if (txApprovals === undefined){
                const errorMessage = `Unexpected Error: TxId: ${txId} not found in approvals list while it was in transaction list`
                logger.error(errorMessage)
                throw new Error(errorMessage)
            }

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
                logger.warn(`Received guard [${signerId}] agreement for txId [${txId}] but signature didn't verify`)
                return
            }

            logger.info(`Guard [${signerId}] Agreed with transaction [${txId}]`)
            pushGuardApproval(txId, signerId, signature)

            if (this.transactionApprovals.get(txId)!.length >= Configs.minimumAgreement) {
                logger.info(`The majority of guards agreed with transaction [${txId}]`)

                const txApproval: TransactionApproved = {
                    "txJson": tx.toJson(),
                    "guardsSignatures": this.transactionApprovals.get(txId)!
                }
                const message = JSON.stringify({
                    "type": "approval",
                    "payload": txApproval
                })
                // broadcast approval message
                dialer.sendMessage(TxAgreement.CHANNEL, message)

                await this.setTxAsApproved(tx)
            }
        }
    }

    /**
     * verifies approval message sent by other guards, set tx as approved if enough guards agreed with tx
     * @param tx
     * @param guardsSignatures
     * @param sender
     */
    processApprovalMessage = async (tx: PaymentTransaction, guardsSignatures: AgreementPayload[], sender: string): Promise<void> => {
        if (guardsSignatures.some(approval => !tx.verifyMetaDataSignature(approval.guardId, approval.signature))) {
            logger.warn(`Received approval message for txId [${tx.txId}] from sender [${sender}] but at least one signature doesn't verify`)
            return
        }

        const agreedTx = this.transactions.get(tx.txId)
        if (agreedTx === undefined) {
            logger.info(`Other guards [${guardsSignatures.map(approval => approval.guardId)}] agreed on tx with id: ${tx.txId}`)
        }
        else {
            logger.info(`Transaction [${tx.txId}] approved`)
            await this.setTxAsApproved(tx)
        }
    }

    /**
     * sets the transaction as approved in db and removes it from memory
     * @param tx
     */
    setTxAsApproved = async (tx: PaymentTransaction): Promise<void> => {
        try {
            await TransactionProcessor.signSemaphore.acquire().then(async (release) => {
                try {
                    await dbAction.insertTx(tx)
                    release()
                }
                catch (e) {
                    release()
                    logger.error(`An error occurred while inserting tx to db: ${e}`)
                    throw e
                }
            })
            await this.updateEventOfApprovedTx(tx)
            this.transactions.delete(tx.txId)
            this.transactionApprovals.delete(tx.txId)
            if (this.eventAgreedTransactions.has(tx.eventId)) this.eventAgreedTransactions.delete(tx.eventId)
        }
        catch (e) {
            logger.info(`Unexpected Error occurred while setting tx [${tx.txId}] as approved: ${e}`)
        }
    }

    /**
     * updates event status for a tx
     * @param tx
     */
    updateEventOfApprovedTx = async (tx: PaymentTransaction): Promise<void> => {
        try {
            if (tx.txType === TransactionTypes.payment)
                await dbAction.setEventStatus(tx.eventId, EventStatus.inPayment)
            else
                await dbAction.setEventStatus(tx.eventId, EventStatus.inReward)
        }
        catch (e) {
            logger.info(`Unexpected Error occurred while updating event [${tx.eventId}] with status: [${e}]`)
        }
    }

    /**
     * iterates over active transaction and resend its request
     */
    resendTransactionRequests = (): void => {
        logger.info(`Resending generated transactions for agreement: [${this.transactions.size}]`)
        const creatorId = Configs.guardId
        this.transactions.forEach(tx => {
            try {
                const guardSignature = tx.signMetaData()
                this.broadcastTransactionRequest(tx, creatorId, guardSignature)
            }
            catch (e) {
                logger.info(`Unexpected Error occurred while resending tx [${tx.txId}]: ${e}`)
            }
        })
    }

    /**
     * clears all pending for agreement txs in memory
     */
    clearTransactions = (): void => {
        logger.info(`Clearing generated transactions from memory: [${this.transactions.size}]`)
        this.transactions.clear()
        this.transactionApprovals.clear()
    }

    /**
     * clears all pending for approval txs in memory and db
     */
    clearAgreedTransactions = async (): Promise<void> => {
        logger.info(`Clearing agreed transactions from memory: [${this.transactions.size}]`)
        this.transactions.clear()
        this.eventAgreedTransactions.clear()
    }

}

const txAgreement = new TxAgreement()

export default TxAgreement
export { txAgreement }
