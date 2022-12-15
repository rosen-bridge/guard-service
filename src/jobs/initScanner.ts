import { ErgoNodeScanner } from '@rosen-bridge/scanner';
import ergoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import { ormDataSource } from '../../config/ormDataSource';
import {
  CommitmentExtractor,
  EventTriggerExtractor,
} from '@rosen-bridge/watcher-data-extractor';
import CardanoConfigs from '../chains/cardano/helpers/CardanoConfigs';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';

let ergoScanner: ErgoNodeScanner;

/**
 * runs ergo block scanner
 */
const ergoScannerJob = () => {
  ergoScanner
    .update()
    .then(() => setTimeout(ergoScannerJob, ergoConfigs.scannerInterval * 1000));
};

/**
 * initialize ergo scanner and extractors
 */
const initScanner = () => {
  const scannerConfig = {
    nodeUrl: ergoConfigs.node.url,
    timeout: ergoConfigs.node.timeout * 1000,
    initialHeight: ergoConfigs.initialHeight,
    dataSource: ormDataSource,
  };
  ergoScanner = new ErgoNodeScanner(scannerConfig);
  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [CardanoConfigs.cardanoContractConfig.commitmentAddress],
    CardanoConfigs.cardanoContractConfig.RWTId,
    ormDataSource
  );
  const cardanoEventTriggerExtractor = new EventTriggerExtractor(
    'cardanoEventTrigger',
    ormDataSource,
    CardanoConfigs.cardanoContractConfig.eventTriggerAddress,
    CardanoConfigs.cardanoContractConfig.RWTId
  );
  const ergoCommitmentExtractor = new CommitmentExtractor(
    'ergoCommitment',
    [ErgoConfigs.ergoContractConfig.commitmentAddress],
    ErgoConfigs.ergoContractConfig.RWTId,
    ormDataSource
  );
  const ergoEventTriggerExtractor = new EventTriggerExtractor(
    'ergoEventTrigger',
    ormDataSource,
    ErgoConfigs.ergoContractConfig.eventTriggerAddress,
    ErgoConfigs.ergoContractConfig.RWTId
  );
  ergoScanner.registerExtractor(cardanoCommitmentExtractor);
  ergoScanner.registerExtractor(cardanoEventTriggerExtractor);
  ergoScanner.registerExtractor(ergoCommitmentExtractor);
  ergoScanner.registerExtractor(ergoEventTriggerExtractor);

  ergoScannerJob();
};

export { initScanner };
