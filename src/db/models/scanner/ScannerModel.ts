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
        await this.EventRepository.createQueryBuilder("events")
            .innerJoinAndSelect("eventTxs", "txs", "events.sourceTxId = txs.eventId")
            .update()
            .set({
                status: "approved"
            })
            .where("txs.txId = :id", {id: txId})
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

}

const scannerAction = new ScannerDataBase(scannerOrmDataSource)

export {
    ScannerDataBase,
    scannerAction
}
