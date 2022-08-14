import { DataSource, In, IsNull, LessThan, Not, Repository } from "typeorm";
import { ConfirmedEventEntity } from "./entities/ConfirmedEventEntity";
import { ormDataSource } from "../../config/ormDataSource";
import { TransactionEntity } from "./entities/TransactionEntity";
import { EventStatus, PaymentTransaction, TransactionStatus } from "../models/Models";
import { CommitmentEntity, EventTriggerEntity } from "@rosen-bridge/watcher-data-extractor";
import Utils from "../helpers/Utils";

class DatabaseAction {
    dataSource: DataSource;
    CommitmentRepository: Repository<CommitmentEntity>;
    EventRepository: Repository<EventTriggerEntity>;
    ConfirmedEventRepository: Repository<ConfirmedEventEntity>;
    TransactionRepository: Repository<TransactionEntity>;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.CommitmentRepository = this.dataSource.getRepository(CommitmentEntity);
        this.EventRepository = this.dataSource.getRepository(EventTriggerEntity);
        this.ConfirmedEventRepository = this.dataSource.getRepository(ConfirmedEventEntity);
        this.TransactionRepository = this.dataSource.getRepository(TransactionEntity);
    }

    /**
     * updates the status of an event by id
     * @param eventId the event trigger id
     * @param status the event trigger status
     */
    setEventStatus = async (eventId: string, status: string): Promise<void> => {
        await this.ConfirmedEventRepository.createQueryBuilder()
            .update()
            .set({
                status: status
            })
            .where("id = :id", {id: eventId})
            .execute()
    }

    /**
     * @param eventId the event trigger id
     * @return the event trigger
     */
    getEventById = async (eventId: string): Promise<ConfirmedEventEntity | null> => {
        return await this.ConfirmedEventRepository.findOne({
            relations: ["eventData"],
            where: {
                "id": eventId
            }
        })
    }

    /**
     * @return the event triggers with corresponding status
     */
    getPendingEvents = async (): Promise<ConfirmedEventEntity[]> => {
        return await this.ConfirmedEventRepository.find({
            relations: ["eventData"],
            where: [
                {
                    "status": EventStatus.pendingPayment
                },
                {
                    "status": EventStatus.pendingReward
                }
            ]
        })
    }

    /**
     * @return incomplete the transaction
     */
    getActiveTransactions = async (): Promise<TransactionEntity[]> => {
        return await this.TransactionRepository.find({
            relations: ["event"],
            where: {
                "status": In([
                    TransactionStatus.sent,
                    TransactionStatus.signed,
                    TransactionStatus.approved,
                    TransactionStatus.signFailed
                ])
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
        await this.ConfirmedEventRepository.createQueryBuilder()
            .update()
            .set({
                status: status
            })
            .where("id = :id", {id: eventId})
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

        const txs = (await this.getEventTxsByType(event.id, newTx.txType)).filter(tx => tx.status !== TransactionStatus.invalid)
        if (txs.length > 1)
            throw Error(`impossible case, event [${newTx.eventId}] has already more than 1 (${txs.length}) active ${newTx.txType} tx`)
        else if (txs.length === 1) {
            const tx = txs[0]
            if (tx.status === TransactionStatus.approved) {
                if (newTx.txId < tx.txId) {
                    console.log(`replacing tx [${tx.txId}] with new transaction [${newTx.txId}] due to lower txId`)
                    await this.replaceTx(tx.txId, newTx)
                }
                else
                    console.log(`ignoring tx [${newTx.txId}] due to higher txId, comparing to [${tx.txId}]`)
            }
            else
                console.warn(`received approval for tx [${newTx.txId}] where its event [${event.id}] has already a completed transaction [${tx.txId}]`)
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
    private insertNewTx = async (paymentTx: PaymentTransaction, event: ConfirmedEventEntity): Promise<void> => {
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

    /**
     * @param eventId the event trigger id
     * @param eventBoxHeight the event trigger box mined height
     * @return the event trigger
     */
    getValidCommitments = async (eventId: string, eventBoxHeight: number): Promise<CommitmentEntity[]> => {
        return await this.CommitmentRepository.find({
            where: {
                eventId: eventId,
                height: LessThan(eventBoxHeight),
                spendBlockHash: Not(IsNull())
            }
        })
    }

    /** TODO: when extractor is able to capture spent status of events, update query to just get unspent events
     * @return all event triggers with no spent block
     */
    getUnspentEvents = async (): Promise<EventTriggerEntity[]> => {
        return await this.EventRepository.find()
    }

    /**
     * inserts a confirmed event into table
     * @param eventData
     */
    insertConfirmedEvent = async (eventData: EventTriggerEntity): Promise<void> => {
        await this.ConfirmedEventRepository.createQueryBuilder()
            .insert()
            .values({
                id: Utils.txIdToEventId(eventData.sourceTxId),
                eventData: eventData,
                status: EventStatus.pendingPayment,
            })
            .execute()
    }

}

const dbAction = new DatabaseAction(ormDataSource)

export {
    DatabaseAction,
    dbAction
}
