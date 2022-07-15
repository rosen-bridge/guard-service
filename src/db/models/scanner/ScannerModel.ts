import { DataSource, Repository } from "typeorm";
import { EventTriggerEntity } from "../../entities/scanner/EventTriggerEntity";
import { scannerOrmDataSource } from "../../../../config/scannerOrmDataSource";

class ScannerDataBase {
    dataSource: DataSource;
    EventRepository: Repository<EventTriggerEntity>;

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
     * @param eventId the event trigger id
     * @return the request to sign the transaction
     */
    getEventById = async (eventId: string): Promise<EventTriggerEntity | null> => {
        return await this.EventRepository.createQueryBuilder()
            .select()
            .where("sourceTxId = :id", {id: eventId})
            .getOne()
    }

    /**
     * updates the txId and txJson of an event
     * @param eventId the event trigger id
     * @param txId the transaction id
     * @param txJson json serialized of the transaction
     */
    setEventTx = async (eventId: string, txId: string, txJson: string): Promise<void> => {
        await this.EventRepository.createQueryBuilder()
            .update()
            .set({
                status: "agreed",
                txId: txId,
                paymentTxJson: txJson
            })
            .where("sourceTxId = :id", {id: eventId})
            .execute()
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
