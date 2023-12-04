import { ErgoNetworkType, ErgoScanner } from '@rosen-bridge/scanner';
import { dataSource } from '../db/dataSource';
import {
  CommitmentExtractor,
  EventTriggerExtractor,
} from '@rosen-bridge/watcher-data-extractor';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import WinstonLogger from '@rosen-bridge/winston-logger';

let ergoScanner: ErgoScanner;

/**
 * runs ergo block scanner
 */
const ergoScannerJob = () => {
  ergoScanner
    .update()
    .then(() =>
      setTimeout(ergoScannerJob, GuardsErgoConfigs.scannerInterval * 1000)
    );
};

/**
 * Creates loggers for scanners and extractors
 * @returns loggers object
 */
const createLoggers = () => ({
  ergoScannerLogger: WinstonLogger.getInstance().getLogger('ergo-scanner'),
  cardanoCommitmentExtractorLogger: WinstonLogger.getInstance().getLogger(
    'cardano-commitment-extractor'
  ),
  cardanoEventTriggerExtractorLogger: WinstonLogger.getInstance().getLogger(
    'cardano-event-trigger-extractor'
  ),
  ergoCommitmentExtractorLogger: WinstonLogger.getInstance().getLogger(
    'ergo-commitment-extractor'
  ),
  ergoEventTriggerExtractorLogger: WinstonLogger.getInstance().getLogger(
    'ergo-event-trigger-extractor'
  ),
});

/**
 * initialize ergo scanner and extractors
 */
const initScanner = () => {
  const scannerConfig =
    GuardsErgoConfigs.chainNetworkName === ErgoNetworkType.Node
      ? {
          type: ErgoNetworkType.Node,
          url: GuardsErgoConfigs.node.url,
          timeout: GuardsErgoConfigs.node.timeout * 1000,
          initialHeight: GuardsErgoConfigs.initialHeight,
          dataSource,
        }
      : {
          type: ErgoNetworkType.Explorer,
          url: GuardsErgoConfigs.explorer.url,
          timeout: GuardsErgoConfigs.explorer.timeout * 1000,
          initialHeight: GuardsErgoConfigs.initialHeight,
          dataSource,
        };

  const loggers = createLoggers();

  ergoScanner = new ErgoScanner(scannerConfig, loggers.ergoScannerLogger);
  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [GuardsCardanoConfigs.cardanoContractConfig.commitmentAddress],
    GuardsCardanoConfigs.cardanoContractConfig.RWTId,
    dataSource,
    loggers.cardanoCommitmentExtractorLogger
  );
  const cardanoEventTriggerExtractor = new EventTriggerExtractor(
    'cardanoEventTrigger',
    dataSource,
    GuardsCardanoConfigs.cardanoContractConfig.eventTriggerAddress,
    GuardsCardanoConfigs.cardanoContractConfig.RWTId,
    GuardsCardanoConfigs.cardanoContractConfig.permitAddress,
    GuardsCardanoConfigs.cardanoContractConfig.fraudAddress,
    loggers.cardanoEventTriggerExtractorLogger
  );
  const ergoCommitmentExtractor = new CommitmentExtractor(
    'ergoCommitment',
    [GuardsErgoConfigs.ergoContractConfig.commitmentAddress],
    GuardsErgoConfigs.ergoContractConfig.RWTId,
    dataSource,
    loggers.ergoCommitmentExtractorLogger
  );
  const ergoEventTriggerExtractor = new EventTriggerExtractor(
    'ergoEventTrigger',
    dataSource,
    GuardsErgoConfigs.ergoContractConfig.eventTriggerAddress,
    GuardsErgoConfigs.ergoContractConfig.RWTId,
    GuardsErgoConfigs.ergoContractConfig.permitAddress,
    GuardsErgoConfigs.ergoContractConfig.fraudAddress,
    loggers.ergoEventTriggerExtractorLogger
  );
  ergoScanner.registerExtractor(cardanoCommitmentExtractor);
  ergoScanner.registerExtractor(cardanoEventTriggerExtractor);
  ergoScanner.registerExtractor(ergoCommitmentExtractor);
  ergoScanner.registerExtractor(ergoEventTriggerExtractor);

  ergoScannerJob();
};

export { initScanner };
