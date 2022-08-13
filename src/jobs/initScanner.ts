import { ErgoScanner } from "@rosen-bridge/scanner";
import ergoConfigs from "../chains/ergo/helpers/ErgoConfigs";
import { ormDataSource } from "../../config/ormDataSource";
import {
    CommitmentEntity,
    CommitmentExtractor,
    EventTriggerEntity,
    EventTriggerExtractor
} from "@rosen-bridge/watcher-data-extractor";
import { Repository } from "typeorm";

let ergoScanner: ErgoScanner
let commitmentRepository: Repository<CommitmentEntity>
let eventTriggerRepository: Repository<EventTriggerEntity>

const ergoScannerJob = async () => {
    ergoScanner.update().then(() => setTimeout(ergoScannerJob, ergoConfigs.scannerInterval* 1000))
}

const initScanner = () => {
    const scannerConfig = {
        nodeUrl: ergoConfigs.node.url,
        timeout: ergoConfigs.node.timeout,
        initialHeight: ergoConfigs.initialHeight,
        dataSource: ormDataSource,
    }
    ergoScanner = new ErgoScanner(scannerConfig);
    const commitmentExtractor = new CommitmentExtractor("1", [], "rwt", ormDataSource)
    const eventTriggerExtractor = new EventTriggerExtractor("1", ormDataSource, "address", "rwt")
    ergoScanner.registerExtractor(commitmentExtractor)
    ergoScanner.registerExtractor(eventTriggerExtractor)
    ergoScanner.blockRepository.find()
    commitmentRepository = ormDataSource.getRepository(CommitmentEntity)
    eventTriggerRepository = ormDataSource.getRepository(EventTriggerEntity)
}

export { initScanner, commitmentRepository, eventTriggerRepository }
