import { ErgoNodeScanner } from '@rosen-bridge/scanner';
import ergoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import { dataSource } from '../../config/dataSource';
import {
  CommitmentExtractor,
  EventTriggerExtractor,
} from '@rosen-bridge/watcher-data-extractor';
import CardanoConfigs from '../chains/cardano/helpers/CardanoConfigs';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import { loggerFactory } from '../log/Logger';

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
 * Creates loggers for scanners and extractors
 * @returns loggers object
 */
const createLoggers = () => ({
  ergoScannerLogger: loggerFactory('ergo-scanner'),
  cardanoCommitmentExtractorLogger: loggerFactory(
    'cardano-commitment-extractor'
  ),
  cardanoEventTriggerExtractorLogger: loggerFactory(
    'cardano-event-trigger-extractor'
  ),
  ergoCommitmentExtractorLogger: loggerFactory('ergo-commitment-extractor'),
  ergoEventTriggerExtractorLogger: loggerFactory(
    'ergo-event-trigger-extractor'
  ),
});

/**
 * initialize ergo scanner and extractors
 */
const initScanner = () => {
  const scannerConfig = {
    nodeUrl: ergoConfigs.node.url,
    timeout: ergoConfigs.node.timeout * 1000,
    initialHeight: ergoConfigs.initialHeight,
    dataSource,
  };

  const loggers = createLoggers();

  ergoScanner = new ErgoNodeScanner(scannerConfig, loggers.ergoScannerLogger);
  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [CardanoConfigs.cardanoContractConfig.commitmentAddress],
    CardanoConfigs.cardanoContractConfig.RWTId,
    dataSource,
    loggers.cardanoCommitmentExtractorLogger
  );
  const cardanoEventTriggerExtractor = new EventTriggerExtractor(
    'cardanoEventTrigger',
    dataSource,
    CardanoConfigs.cardanoContractConfig.eventTriggerAddress,
    CardanoConfigs.cardanoContractConfig.RWTId,
    loggers.cardanoEventTriggerExtractorLogger
  );
  const ergoCommitmentExtractor = new CommitmentExtractor(
    'ergoCommitment',
    [ErgoConfigs.ergoContractConfig.commitmentAddress],
    ErgoConfigs.ergoContractConfig.RWTId,
    dataSource,
    loggers.ergoCommitmentExtractorLogger
  );
  const ergoEventTriggerExtractor = new EventTriggerExtractor(
    'ergoEventTrigger',
    dataSource,
    ErgoConfigs.ergoContractConfig.eventTriggerAddress,
    ErgoConfigs.ergoContractConfig.RWTId,
    loggers.ergoCommitmentExtractorLogger
  );
  ergoScanner.registerExtractor(cardanoCommitmentExtractor);
  ergoScanner.registerExtractor(cardanoEventTriggerExtractor);
  ergoScanner.registerExtractor(ergoCommitmentExtractor);
  ergoScanner.registerExtractor(ergoEventTriggerExtractor);

  ergoScannerJob();
};

export { initScanner };
