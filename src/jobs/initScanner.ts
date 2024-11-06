import { ErgoNetworkType, ErgoScanner } from '@rosen-bridge/scanner';
import { dataSource } from '../db/dataSource';
import {
  CommitmentExtractor,
  EventTriggerExtractor,
} from '@rosen-bridge/watcher-data-extractor';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import WinstonLogger from '@rosen-bridge/winston-logger';
import GuardsBitcoinConfigs from '../configs/GuardsBitcoinConfigs';
import GuardsDogeConfigs from '../configs/GuardsDogeConfigs';
import Configs from '../configs/Configs';
import GuardsEthereumConfigs from '../configs/GuardsEthereumConfigs';
import { EvmRpcScanner } from '@rosen-bridge/evm-rpc-scanner';
import { EvmTxExtractor } from '@rosen-bridge/evm-address-tx-extractor';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

let ergoScanner: ErgoScanner;
let ethereumScanner: EvmRpcScanner;

/**
 * runs ergo block scanner
 */
const ergoScannerJob = () => {
  ergoScanner
    .update()
    .then(() =>
      setTimeout(ergoScannerJob, GuardsErgoConfigs.scannerInterval * 1000)
    )
    .catch((e) => {
      logger.warn(`An error occurred in Ergo scanner job: ${e}`);
      logger.warn(e.stack);
      setTimeout(ergoScannerJob, GuardsErgoConfigs.scannerInterval * 1000);
    });
};

/**
 * runs ethereum block scanner
 */
const ethereumScannerJob = () => {
  ethereumScanner
    .update()
    .then(() =>
      setTimeout(
        ethereumScannerJob,
        GuardsEthereumConfigs.rpc.scannerInterval * 1000
      )
    )
    .catch((e) => {
      logger.warn(`An error occurred in Ethereum scanner job: ${e}`);
      logger.warn(e.stack);
      setTimeout(
        ethereumScannerJob,
        GuardsEthereumConfigs.rpc.scannerInterval * 1000
      );
    });
};

/**
 * Creates loggers for scanners and extractors
 * @returns loggers object
 */
const createLoggers = () => ({
  ergoScannerLogger: WinstonLogger.getInstance().getLogger('ergo-scanner'),
  bitcoinCommitmentExtractorLogger: WinstonLogger.getInstance().getLogger(
    'bitcoin-commitment-extractor'
  ),
  bitcoinEventTriggerExtractorLogger: WinstonLogger.getInstance().getLogger(
    'bitcoin-event-trigger-extractor'
  ),
  dogeCommitmentExtractorLogger: WinstonLogger.getInstance().getLogger(
    'doge-commitment-extractor'
  ),
  dogeEventTriggerExtractorLogger: WinstonLogger.getInstance().getLogger(
    'doge-event-trigger-extractor'
  ),
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
  ethereumCommitmentExtractorLogger: WinstonLogger.getInstance().getLogger(
    'ethereum-commitment-extractor'
  ),
  ethereumEventTriggerExtractorLogger: WinstonLogger.getInstance().getLogger(
    'ethereum-event-trigger-extractor'
  ),
  ethereumScannerLogger:
    WinstonLogger.getInstance().getLogger('ethereum-scanner'),
  ethereumLockAddressTxExtractorLogger: WinstonLogger.getInstance().getLogger(
    'ethereum-lock-address-tx-extractor'
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
  const tokens = Configs.tokens();

  ergoScanner = new ErgoScanner(scannerConfig, loggers.ergoScannerLogger);

  const bitcoinCommitmentExtractor = new CommitmentExtractor(
    'bitcoinCommitment',
    [GuardsBitcoinConfigs.bitcoinContractConfig.commitmentAddress],
    GuardsBitcoinConfigs.bitcoinContractConfig.RWTId,
    dataSource,
    tokens,
    loggers.bitcoinCommitmentExtractorLogger
  );
  const bitcoinEventTriggerExtractor = new EventTriggerExtractor(
    'bitcoinEventTrigger',
    dataSource,
    GuardsBitcoinConfigs.bitcoinContractConfig.eventTriggerAddress,
    GuardsBitcoinConfigs.bitcoinContractConfig.RWTId,
    GuardsBitcoinConfigs.bitcoinContractConfig.permitAddress,
    GuardsBitcoinConfigs.bitcoinContractConfig.fraudAddress,
    loggers.bitcoinEventTriggerExtractorLogger
  );

  const dogeCommitmentExtractor = new CommitmentExtractor(
    'dogeCommitment',
    [GuardsDogeConfigs.dogeContractConfig.commitmentAddress],
    GuardsDogeConfigs.dogeContractConfig.RWTId,
    dataSource,
    tokens,
    loggers.dogeCommitmentExtractorLogger
  );

  const dogeEventTriggerExtractor = new EventTriggerExtractor(
    'dogeEventTrigger',
    dataSource,
    GuardsDogeConfigs.dogeContractConfig.eventTriggerAddress,
    GuardsDogeConfigs.dogeContractConfig.RWTId,
    GuardsDogeConfigs.dogeContractConfig.permitAddress,
    GuardsDogeConfigs.dogeContractConfig.fraudAddress,
    loggers.dogeEventTriggerExtractorLogger
  );

  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [GuardsCardanoConfigs.cardanoContractConfig.commitmentAddress],
    GuardsCardanoConfigs.cardanoContractConfig.RWTId,
    dataSource,
    tokens,
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
    tokens,
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

  const ethereumCommitmentExtractor = new CommitmentExtractor(
    'ethereumCommitment',
    [GuardsEthereumConfigs.ethereumContractConfig.commitmentAddress],
    GuardsEthereumConfigs.ethereumContractConfig.RWTId,
    dataSource,
    tokens,
    loggers.ethereumCommitmentExtractorLogger
  );
  const ethereumEventTriggerExtractor = new EventTriggerExtractor(
    'ethereumEventTrigger',
    dataSource,
    GuardsEthereumConfigs.ethereumContractConfig.eventTriggerAddress,
    GuardsEthereumConfigs.ethereumContractConfig.RWTId,
    GuardsEthereumConfigs.ethereumContractConfig.permitAddress,
    GuardsEthereumConfigs.ethereumContractConfig.fraudAddress,
    loggers.ethereumEventTriggerExtractorLogger
  );

  ergoScanner.registerExtractor(bitcoinCommitmentExtractor);
  ergoScanner.registerExtractor(bitcoinEventTriggerExtractor);
  ergoScanner.registerExtractor(cardanoCommitmentExtractor);
  ergoScanner.registerExtractor(cardanoEventTriggerExtractor);
  ergoScanner.registerExtractor(ergoCommitmentExtractor);
  ergoScanner.registerExtractor(ergoEventTriggerExtractor);
  ergoScanner.registerExtractor(ethereumCommitmentExtractor);
  ergoScanner.registerExtractor(ethereumEventTriggerExtractor);
  ergoScanner.registerExtractor(dogeCommitmentExtractor);
  ergoScanner.registerExtractor(dogeEventTriggerExtractor);

  ergoScannerJob();

  if (GuardsEthereumConfigs.chainNetworkName === 'rpc') {
    // RPC network requires ethereum scanner
    ethereumScanner = new EvmRpcScanner(
      ETHEREUM_CHAIN,
      {
        RpcUrl: GuardsEthereumConfigs.rpc.url,
        timeout: GuardsEthereumConfigs.rpc.timeout,
        initialHeight: GuardsEthereumConfigs.rpc.initialHeight,
        dataSource: dataSource,
      },
      loggers.ethereumScannerLogger,
      GuardsEthereumConfigs.rpc.authToken
    );
    const ethereumAddressTxExtractor = new EvmTxExtractor(
      dataSource,
      'ethereum-lock-address',
      GuardsEthereumConfigs.ethereumContractConfig.lockAddress,
      loggers.ethereumLockAddressTxExtractorLogger
    );
    ethereumScanner.registerExtractor(ethereumAddressTxExtractor);
    // run ethereum scanner job
    ethereumScannerJob();
  }
};

export { initScanner };
