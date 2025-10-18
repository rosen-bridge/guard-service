import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import {
  ErgoExplorerNetwork,
  ErgoNodeNetwork,
  ErgoScanner,
} from '@rosen-bridge/ergo-scanner';
import { EvmTxExtractor } from '@rosen-bridge/evm-address-tx-extractor';
import { EvmRpcNetwork, EvmRpcScanner } from '@rosen-bridge/evm-scanner';
import { ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';
import {
  CommitmentExtractor,
  EventTriggerExtractor,
} from '@rosen-bridge/watcher-data-extractor';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

import GuardsBinanceConfigs from '../configs/guardsBinanceConfigs';
import GuardsBitcoinConfigs from '../configs/guardsBitcoinConfigs';
import GuardsBitcoinRunesConfigs from '../configs/guardsBitcoinRunesConfigs';
import GuardsCardanoConfigs from '../configs/guardsCardanoConfigs';
import GuardsDogeConfigs from '../configs/guardsDogeConfigs';
import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import GuardsEthereumConfigs from '../configs/guardsEthereumConfigs';
import { dataSource } from '../db/dataSource';
import { TokenHandler } from '../handlers/tokenHandler';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

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
      setTimeout(ergoScannerJob, GuardsErgoConfigs.scannerInterval * 1000),
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
        GuardsEthereumConfigs.rpc.scannerInterval * 1000,
      ),
    )
    .catch((e) => {
      logger.warn(`An error occurred in Ethereum scanner job: ${e}`);
      logger.warn(e.stack);
      setTimeout(
        ethereumScannerJob,
        GuardsEthereumConfigs.rpc.scannerInterval * 1000,
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
        GuardsBinanceConfigs.rpc.scannerInterval * 1000,
      ),
    )
    .catch((e) => {
      logger.warn(`An error occurred in Binance scanner job: ${e}`);
      logger.warn(e.stack);
      setTimeout(
        binanceScannerJob,
        GuardsBinanceConfigs.rpc.scannerInterval * 1000,
      );
    });
};

/**
 * Creates loggers for scanners and extractors
 * @returns loggers object
 */
const createLoggers = () => ({
  ergoScannerLogger:
    CallbackLoggerFactory.getInstance().getLogger('ergo-scanner'),
  bitcoinCommitmentExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'bitcoin-commitment-extractor',
    ),
  bitcoinEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'bitcoin-event-trigger-extractor',
    ),
  cardanoCommitmentExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'cardano-commitment-extractor',
    ),
  cardanoEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'cardano-event-trigger-extractor',
    ),
  ergoCommitmentExtractorLogger: CallbackLoggerFactory.getInstance().getLogger(
    'ergo-commitment-extractor',
  ),
  ergoEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'ergo-event-trigger-extractor',
    ),
  ethereumCommitmentExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'ethereum-commitment-extractor',
    ),
  ethereumEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'ethereum-event-trigger-extractor',
    ),
  ethereumScannerLogger:
    CallbackLoggerFactory.getInstance().getLogger('ethereum-scanner'),
  ethereumLockAddressTxExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'ethereum-lock-address-tx-extractor',
    ),
  binanceCommitmentExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'binance-commitment-extractor',
    ),
  binanceEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'binance-event-trigger-extractor',
    ),
  binanceScannerLogger:
    CallbackLoggerFactory.getInstance().getLogger('binance-scanner'),
  binanceLockAddressTxExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'binance-lock-address-tx-extractor',
    ),
  dogeCommitmentExtractorLogger: CallbackLoggerFactory.getInstance().getLogger(
    'doge-commitment-extractor',
  ),
  dogeEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'doge-event-trigger-extractor',
    ),
  bitcoinRunesCommitmentExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'bitcoin-runes-commitment-extractor',
    ),
  bitcoinRunesEventTriggerExtractorLogger:
    CallbackLoggerFactory.getInstance().getLogger(
      'bitcoin-runes-event-trigger-extractor',
    ),
});

/**
 * initialize ergo scanner and extractors
 */
const initScanner = () => {
  const loggers = createLoggers();

  const scannerConfig =
    GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
      ? {
          dataSource: dataSource,
          initialHeight: GuardsErgoConfigs.initialHeight,
          network: new ErgoNodeNetwork(GuardsErgoConfigs.node.url),
          logger: loggers.ergoScannerLogger,
        }
      : {
          dataSource: dataSource,
          initialHeight: GuardsErgoConfigs.initialHeight,
          network: new ErgoExplorerNetwork(GuardsErgoConfigs.explorer.url),
          logger: loggers.ergoScannerLogger,
        };

  ergoScanner = new ErgoScanner(scannerConfig);

  const networkType =
    GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
      ? ErgoNetworkType.Node
      : ErgoNetworkType.Explorer;
  const networkUrl =
    networkType === ErgoNetworkType.Node
      ? GuardsErgoConfigs.node.url
      : GuardsErgoConfigs.explorer.url;

  // init Bitcoin extractors
  const bitcoinCommitmentExtractor = new CommitmentExtractor(
    'bitcoinCommitment',
    [GuardsBitcoinConfigs.bitcoinContractConfig.commitmentAddress],
    GuardsBitcoinConfigs.bitcoinContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.bitcoinCommitmentExtractorLogger,
  );
  const bitcoinEventTriggerExtractor = new EventTriggerExtractor(
    'bitcoinEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsBitcoinConfigs.bitcoinContractConfig.eventTriggerAddress,
    GuardsBitcoinConfigs.bitcoinContractConfig.RWTId,
    GuardsBitcoinConfigs.bitcoinContractConfig.permitAddress,
    GuardsBitcoinConfigs.bitcoinContractConfig.fraudAddress,
    loggers.bitcoinEventTriggerExtractorLogger,
  );

  // init Doge extractors
  const dogeCommitmentExtractor = new CommitmentExtractor(
    'dogeCommitment',
    [GuardsDogeConfigs.dogeContractConfig.commitmentAddress],
    GuardsDogeConfigs.dogeContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.dogeCommitmentExtractorLogger,
  );

  const dogeEventTriggerExtractor = new EventTriggerExtractor(
    'dogeEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsDogeConfigs.dogeContractConfig.eventTriggerAddress,
    GuardsDogeConfigs.dogeContractConfig.RWTId,
    GuardsDogeConfigs.dogeContractConfig.permitAddress,
    GuardsDogeConfigs.dogeContractConfig.fraudAddress,
    loggers.dogeEventTriggerExtractorLogger,
  );

  // init Cardano extractors
  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [GuardsCardanoConfigs.cardanoContractConfig.commitmentAddress],
    GuardsCardanoConfigs.cardanoContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.cardanoCommitmentExtractorLogger,
  );
  const cardanoEventTriggerExtractor = new EventTriggerExtractor(
    'cardanoEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsCardanoConfigs.cardanoContractConfig.eventTriggerAddress,
    GuardsCardanoConfigs.cardanoContractConfig.RWTId,
    GuardsCardanoConfigs.cardanoContractConfig.permitAddress,
    GuardsCardanoConfigs.cardanoContractConfig.fraudAddress,
    loggers.cardanoEventTriggerExtractorLogger,
  );

  // init Ergo extractors
  const ergoCommitmentExtractor = new CommitmentExtractor(
    'ergoCommitment',
    [GuardsErgoConfigs.ergoContractConfig.commitmentAddress],
    GuardsErgoConfigs.ergoContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.ergoCommitmentExtractorLogger,
  );
  const ergoEventTriggerExtractor = new EventTriggerExtractor(
    'ergoEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsErgoConfigs.ergoContractConfig.eventTriggerAddress,
    GuardsErgoConfigs.ergoContractConfig.RWTId,
    GuardsErgoConfigs.ergoContractConfig.permitAddress,
    GuardsErgoConfigs.ergoContractConfig.fraudAddress,
    loggers.ergoEventTriggerExtractorLogger,
  );

  // init Ethereum extractors
  const ethereumCommitmentExtractor = new CommitmentExtractor(
    'ethereumCommitment',
    [GuardsEthereumConfigs.ethereumContractConfig.commitmentAddress],
    GuardsEthereumConfigs.ethereumContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.ethereumCommitmentExtractorLogger,
  );
  const ethereumEventTriggerExtractor = new EventTriggerExtractor(
    'ethereumEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsEthereumConfigs.ethereumContractConfig.eventTriggerAddress,
    GuardsEthereumConfigs.ethereumContractConfig.RWTId,
    GuardsEthereumConfigs.ethereumContractConfig.permitAddress,
    GuardsEthereumConfigs.ethereumContractConfig.fraudAddress,
    loggers.ethereumEventTriggerExtractorLogger,
  );

  // init Binance extractors
  const binanceCommitmentExtractor = new CommitmentExtractor(
    'binanceCommitment',
    [GuardsBinanceConfigs.binanceContractConfig.commitmentAddress],
    GuardsBinanceConfigs.binanceContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.binanceCommitmentExtractorLogger,
  );
  const binanceEventTriggerExtractor = new EventTriggerExtractor(
    'binanceEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsBinanceConfigs.binanceContractConfig.eventTriggerAddress,
    GuardsBinanceConfigs.binanceContractConfig.RWTId,
    GuardsBinanceConfigs.binanceContractConfig.permitAddress,
    GuardsBinanceConfigs.binanceContractConfig.fraudAddress,
    loggers.binanceEventTriggerExtractorLogger,
  );
  const bitcoinRunesCommitmentExtractor = new CommitmentExtractor(
    'bitcoinRunesCommitment',
    [GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.commitmentAddress],
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.bitcoinRunesCommitmentExtractorLogger,
  );
  const bitcoinRunesEventTriggerExtractor = new EventTriggerExtractor(
    'bitcoinRunesEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.eventTriggerAddress,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.RWTId,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.permitAddress,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.fraudAddress,
    loggers.bitcoinRunesEventTriggerExtractorLogger,
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
  ergoScanner.registerExtractor(binanceCommitmentExtractor);
  ergoScanner.registerExtractor(binanceEventTriggerExtractor);
  ergoScanner.registerExtractor(bitcoinRunesCommitmentExtractor);
  ergoScanner.registerExtractor(bitcoinRunesEventTriggerExtractor);

  ergoScannerJob();

  // init Ethereum scanner
  if (GuardsEthereumConfigs.chainNetworkName === 'rpc') {
    // RPC network requires ethereum scanner
    ethereumScanner = new EvmRpcScanner(ETHEREUM_CHAIN, {
      dataSource: dataSource,
      initialHeight: GuardsEthereumConfigs.rpc.initialHeight,
      network: new EvmRpcNetwork(
        GuardsEthereumConfigs.rpc.url,
        GuardsEthereumConfigs.rpc.timeout,
        GuardsEthereumConfigs.rpc.authToken,
      ),
      logger: loggers.ethereumScannerLogger,
    });
    const ethereumAddressTxExtractor = new EvmTxExtractor(
      dataSource,
      'ethereum-lock-address',
      GuardsEthereumConfigs.ethereumContractConfig.lockAddress,
      loggers.ethereumLockAddressTxExtractorLogger,
    );
    ethereumScanner.registerExtractor(ethereumAddressTxExtractor);
    // run ethereum scanner job
    ethereumScannerJob();
  }

  // init Binance scanner
  if (GuardsBinanceConfigs.chainNetworkName === 'rpc') {
    // RPC network requires Binance scanner
    binanceScanner = new EvmRpcScanner(BINANCE_CHAIN, {
      dataSource: dataSource,
      initialHeight: GuardsBinanceConfigs.rpc.initialHeight,
      network: new EvmRpcNetwork(
        GuardsBinanceConfigs.rpc.url,
        GuardsBinanceConfigs.rpc.timeout,
        GuardsBinanceConfigs.rpc.authToken,
      ),
      logger: loggers.binanceScannerLogger,
    });
    const BinanceAddressTxExtractor = new EvmTxExtractor(
      dataSource,
      'Binance-lock-address',
      GuardsBinanceConfigs.binanceContractConfig.lockAddress,
      loggers.binanceLockAddressTxExtractorLogger,
    );
    binanceScanner.registerExtractor(BinanceAddressTxExtractor);
    // run Binance scanner job
    binanceScannerJob();
  }
};

export { initScanner };
