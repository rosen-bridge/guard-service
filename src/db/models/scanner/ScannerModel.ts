import { DataSource, Repository } from "typeorm";
import { EventTriggerEntity } from "../../entities/scanner/EventTriggerEntity";
import { scannerOrmDataSource } from "../../../../config/scannerOrmDataSource";
import { Semaphore } from "await-semaphore";

class ScannerDataBase {
    dataSource: DataSource;
    EventRepository: Repository<EventTriggerEntity>;
    private semaphore = new Semaphore(1)

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.EventRepository = this.dataSource.getRepository(EventTriggerEntity);
    }

    /**
     * updates the status of an event with its transaction id
     * @param txId the transaction id
     */
    setEventTxAsApproved = async (txId: string): Promise<void> => {
        await this.EventRepository.createQueryBuilder()
            .update()
            .set({
                status: "approved"
            })
            .where("txId = :id", {id: txId})
            .execute()
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
     * updates the txId and txJson of an event
     * @param eventId the event trigger id
     * @param txId the transaction id
     * @param txJson json serialized of the transaction
     * @param status status of the process
     */
    setEventTx = async (eventId: string, txId: string, txJson: string, status: string = "agreed"): Promise<void> => {
        await this.semaphore.acquire().then(async (release) => {
            const event = await this.getEventById(eventId)
            if (event === null) return
            else if (event.txId === null || event.txId <= txId) {
                await this.EventRepository.createQueryBuilder()
                    .update()
                    .set({
                        status: status,
                        txId: txId,
                        paymentTxJson: txJson
                    })
                    .where("sourceTxId = :id", {id: eventId})
                    .execute()
            }
            release()
        })
    }

    /**
     * removes the transaction of an event with its transaction id
     * @param txId the transaction id
     */
    removeEventTx = async (txId: string): Promise<void> => {
        await this.EventRepository.createQueryBuilder()
            .update()
            .set({
                status: "",
                txId: "",
                paymentTxJson: ""
            })
            .where("txId = :id", {id: txId})
            .execute()
    }

    /**
     * removes all transactions with 'agreed' status
     */
    removeAgreedTx = async (): Promise<void> => {
        await this.EventRepository.createQueryBuilder()
            .update()
            .set({
                status: "",
                txId: "",
                paymentTxJson: ""
            })
            .where("status = :status", {status: "agreed"})
            .execute()
    }

}

const scannerAction = new ScannerDataBase(scannerOrmDataSource)

export {
    ScannerDataBase,
    scannerAction
}
