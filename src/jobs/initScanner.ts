import { ErgoScanner } from "@rosen-bridge/scanner";
import ergoConfigs from "../chains/ergo/helpers/ErgoConfigs";
import { ormDataSource } from "../../config/ormDataSource";
import {
    CommitmentExtractor,
    EventTriggerExtractor
} from "@rosen-bridge/watcher-data-extractor";
import Configs from "../helpers/Configs";
import Contracts from "../contracts/Contracts";

let ergoScanner: ErgoScanner

/**
 * runs ergo block scanner
 */
const ergoScannerJob = () => {
    ergoScanner.update().then(() => setTimeout(ergoScannerJob, ergoConfigs.scannerInterval * 1000))
}

/**
 * initialize ergo scanner and extractors
 */
const initScanner = () => {
    const scannerConfig = {
        nodeUrl: ergoConfigs.node.url,
        timeout: ergoConfigs.node.timeout * 1000,
        initialHeight: ergoConfigs.initialHeight,
        dataSource: ormDataSource,
    }
    ergoScanner = new ErgoScanner(scannerConfig);
    const cardanoCommitmentExtractor = new CommitmentExtractor("cardanoCommitment", [Contracts.commitmentAddress], Configs.cardanoRWT, ormDataSource)
    const cardanoEventTriggerExtractor = new EventTriggerExtractor("cardanoEventTrigger", ormDataSource, Contracts.eventTriggerAddress, Configs.cardanoRWT)
    const ergoCommitmentExtractor = new CommitmentExtractor("ergoCommitment", [Contracts.commitmentAddress], Configs.ergoRWT, ormDataSource)
    const ergoEventTriggerExtractor = new EventTriggerExtractor("ergoEventTrigger", ormDataSource, Contracts.eventTriggerAddress, Configs.ergoRWT)
    ergoScanner.registerExtractor(cardanoCommitmentExtractor)
    ergoScanner.registerExtractor(cardanoEventTriggerExtractor)
    ergoScanner.registerExtractor(ergoCommitmentExtractor)
    ergoScanner.registerExtractor(ergoEventTriggerExtractor)

    ergoScannerJob()
}

export { initScanner }
