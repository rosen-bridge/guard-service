import { DataSource, Not, Repository } from "typeorm";
import { EventTriggerEntity } from "../../entities/scanner/EventTriggerEntity";
import { scannerOrmDataSource } from "../../../../config/scannerOrmDataSource";
import { TransactionEntity } from "../../entities/scanner/TransactionEntity";
import { PaymentTransaction, TransactionStatus } from "../../../models/Models";

class ScannerDataBase {
    dataSource: DataSource;
    EventRepository: Repository<EventTriggerEntity>;
    TransactionRepository: Repository<TransactionEntity>;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.EventRepository = this.dataSource.getRepository(EventTriggerEntity);
        this.TransactionRepository = this.dataSource.getRepository(TransactionEntity);
    }

    /**
     * updates the status of an event by id
     * @param eventId the event trigger id
     * @param status the event trigger status
     */
    setEventStatus = async (eventId: string, status: string): Promise<void> => {
        await this.EventRepository.createQueryBuilder()
            .update()
            .set({
                status: status
            })
            .where("sourceTxId = :id", {id: eventId})
            .execute()
    }

    /**
     * @param eventId the event trigger id
     * @return the event trigger
     */
    getEventById = async (eventId: string): Promise<EventTriggerEntity | null> => {
        return await this.EventRepository.createQueryBuilder()
            .select()
            .where("sourceTxId = :id", {id: eventId})
            .getOne()
    }

    /**
     * @param status the event trigger status
     * @return the event triggers with corresponding status
     */
    getEventsByStatus = async (status: string): Promise<EventTriggerEntity[]> => {
        return await this.EventRepository.createQueryBuilder()
            .select()
            .where("status = :status", {status: status})
            .getMany()
    }

    /**
     * @return incomplete the transaction
     */
    getActiveTransactions = async (): Promise<TransactionEntity[]> => {
        return await this.TransactionRepository.find({
            relations: ["event"],
            where: {
                "status": Not(TransactionStatus.completed)
            }
        })
    }

    /**
     * updates the status of a tx with its id
     * @param txId the transaction id
     * @param status tx status
     */
    setTxStatus = async (txId: string, status: string): Promise<void> => {
        await this.TransactionRepository.createQueryBuilder()
            .update()
            .set({
                status: status
            })
            .where("txId = :id", {id: txId})
            .execute()
    }

    /**
     * updates the status of a tx with its id
     * @param txId the transaction id
     * @param currentHeight current height of the blockchain
     */
    updateTxLastCheck = async (txId: string, currentHeight: number): Promise<void> => {
        await this.TransactionRepository.createQueryBuilder()
            .update()
            .set({
                lastCheck: currentHeight
            })
            .where("txId = :id", {id: txId})
            .execute()
    }

    /**
     * updates the status of an event and clear its tx info
     * @param eventId the event trigger id
     * @param status status of the process
     */
    resetEventTx = async (eventId: string, status: string): Promise<void> => {
        await this.EventRepository.createQueryBuilder()
            .update()
            .set({
                status: status
            })
            .where("sourceTxId = :id", {id: eventId})
            .execute()
    }

    /**
     * @param txId the transaction id
     * @return the transaction
     */
    getTxById = async (txId: string): Promise<TransactionEntity> => {
        return await this.TransactionRepository.findOneOrFail({
            relations: ["event"],
            where: {
                "txId": txId
            }
        })
    }

    /**
     * updates the tx and set status as signed
     * @param txId the transaction id
     * @param txJson tx json
     */
    updateWithSignedTx = async (txId: string, txJson: string): Promise<void> => {
        await this.TransactionRepository.createQueryBuilder()
            .update()
            .set({
                txJson: txJson,
                status: TransactionStatus.signed
            })
            .where("txId = :id", {id: txId})
            .execute()
    }

    /**
     * inserts a new approved tx into Transaction table (if already another approved tx exists, keeps the one with loser txId)
     * @param newTx the transaction
     */
    insertTx = async (newTx: PaymentTransaction): Promise<void> => {
        const event = await this.getEventById(newTx.eventId)
        if (event === null) throw Error(`event [${newTx.eventId}] not found`)

        const txs = (await this.getEventTxsByType(event.sourceTxId, newTx.txType)).filter(tx => tx.status !== TransactionStatus.invalid)
        if (txs.length > 1)
            throw Error(`impossible case, event [${newTx.eventId}] has already more than 1 (${txs.length}) active ${newTx.txType} tx`)
        else if (txs.length === 1) {
            const tx = txs[0]
            if (tx.type === TransactionStatus.approved) {
                if (newTx.txId < tx.txId) {
                    console.log(`replacing tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`)
                    await this.replaceTx(tx.txId, newTx)
                }
                else
                    console.log(`ignoring tx [${newTx.txId}] due to higher txId, comparing to [${tx.txId}]`)
            }
            else
                console.warn(`received approval for tx [${newTx.txId}] where its event [${event.sourceTxId}] has already a completed transaction [${tx.txId}]`)
        }
        else
            await this.insertNewTx(newTx, event)
    }

    /**
     * returns all transaction for corresponding event
     * @param eventId the event trigger id
     * @param type the transaction type
     */
    getEventTxsByType = async (eventId: string, type: string): Promise<TransactionEntity[]> => {
        const event = await this.getEventById(eventId)
        if (event === null) throw Error(`event [${eventId}] not found`)
        return await this.TransactionRepository
            .find({
                relations: ["event"],
                where: {
                    "event": event,
                    "type": type
                }
            })
    }

    /**
     * replaces a transaction with a new one
     * @param previousTxId the previous transaction id
     * @param tx the new transaction
     */
    replaceTx = async (previousTxId: string, tx: PaymentTransaction): Promise<void> => {
        await this.TransactionRepository.createQueryBuilder()
            .update()
            .set({
                txId: tx.txId,
                txJson: tx.toJson(),
                type: tx.txType,
                chain: tx.network,
                status: TransactionStatus.approved,
                lastCheck: 0
            })
            .where("txId = :id", {id: previousTxId})
            .execute()
    }

    /**
     * inserts a tx record into transactions table
     */
    private insertNewTx = async (paymentTx: PaymentTransaction, event: EventTriggerEntity): Promise<void> => {
        await this.TransactionRepository
            .insert({
                txId: paymentTx.txId,
                txJson: paymentTx.toJson(),
                type: paymentTx.txType,
                chain: paymentTx.network,
                status: TransactionStatus.approved,
                lastCheck: 0,
                event: event!
            })
    }

}

const scannerAction = new ScannerDataBase(scannerOrmDataSource)

export {
    ScannerDataBase,
    scannerAction
}
