import { ErgoNetworkType, ErgoScanner } from '@rosen-bridge/scanner';
import { dataSource } from '../db/dataSource';
import {
  CommitmentExtractor,
  EventTriggerExtractor,
} from '@rosen-bridge/watcher-data-extractor';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import GuardsBitcoinConfigs from '../configs/GuardsBitcoinConfigs';
import Configs from '../configs/Configs';
import GuardsEthereumConfigs from '../configs/GuardsEthereumConfigs';
import { EvmRpcScanner } from '@rosen-bridge/evm-rpc-scanner';
import { EvmTxExtractor } from '@rosen-bridge/evm-address-tx-extractor';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import GuardsBinanceConfigs from '../configs/GuardsBinanceConfigs';
import { BINANCE_CHAIN } from '@rosen-chains/binance';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

let ergoScanner: ErgoScanner;
let ethereumScanner: EvmRpcScanner;
let binanceScanner: EvmRpcScanner;

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
 * runs binance block scanner
 */
const binanceScannerJob = () => {
  binanceScanner
    .update()
    .then(() =>
      setTimeout(
        binanceScannerJob,
        GuardsBinanceConfigs.rpc.scannerInterval * 1000
      )
    )
    .catch((e) => {
      logger.warn(`An error occurred in Binance scanner job: ${e}`);
      logger.warn(e.stack);
      setTimeout(
        binanceScannerJob,
        GuardsBinanceConfigs.rpc.scannerInterval * 1000
      );
    });
};

/**
 * Creates loggers for scanners and extractors
 * @returns loggers object
 */
const createLoggers = () => ({
  ergoScannerLogger:
    DefaultLoggerFactory.getInstance().getLogger('ergo-scanner'),
  bitcoinCommitmentExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'bitcoin-commitment-extractor'
    ),
  bitcoinEventTriggerExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'bitcoin-event-trigger-extractor'
    ),
  cardanoCommitmentExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'cardano-commitment-extractor'
    ),
  cardanoEventTriggerExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'cardano-event-trigger-extractor'
    ),
  ergoCommitmentExtractorLogger: DefaultLoggerFactory.getInstance().getLogger(
    'ergo-commitment-extractor'
  ),
  ergoEventTriggerExtractorLogger: DefaultLoggerFactory.getInstance().getLogger(
    'ergo-event-trigger-extractor'
  ),
  ethereumCommitmentExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'ethereum-commitment-extractor'
    ),
  ethereumEventTriggerExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'ethereum-event-trigger-extractor'
    ),
  ethereumScannerLogger:
    DefaultLoggerFactory.getInstance().getLogger('ethereum-scanner'),
  ethereumLockAddressTxExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'ethereum-lock-address-tx-extractor'
    ),
  binanceScannerLogger:
    DefaultLoggerFactory.getInstance().getLogger('binance-scanner'),
  binanceLockAddressTxExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'binance-lock-address-tx-extractor'
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

  if (GuardsBinanceConfigs.chainNetworkName === 'rpc') {
    // RPC network requires Binance scanner
    binanceScanner = new EvmRpcScanner(
      BINANCE_CHAIN,
      {
        RpcUrl: GuardsBinanceConfigs.rpc.url,
        timeout: GuardsBinanceConfigs.rpc.timeout,
        initialHeight: GuardsBinanceConfigs.rpc.initialHeight,
        dataSource: dataSource,
      },
      loggers.binanceScannerLogger,
      GuardsBinanceConfigs.rpc.authToken
    );
    const BinanceAddressTxExtractor = new EvmTxExtractor(
      dataSource,
      'Binance-lock-address',
      GuardsBinanceConfigs.binanceContractConfig.lockAddress,
      loggers.binanceLockAddressTxExtractorLogger
    );
    binanceScanner.registerExtractor(BinanceAddressTxExtractor);
    // run Binance scanner job
    binanceScannerJob();
  }
};

export { initScanner };
