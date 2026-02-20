import { DefaultLogger } from '@rosen-bridge/abstract-logger';
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

import Configs from '../configs/configs';
import GuardsBinanceConfigs from '../configs/guardsBinanceConfigs';
import GuardsBitcoinConfigs from '../configs/guardsBitcoinConfigs';
import GuardsBitcoinRunesConfigs from '../configs/guardsBitcoinRunesConfigs';
import GuardsCardanoConfigs from '../configs/guardsCardanoConfigs';
import GuardsDogeConfigs from '../configs/guardsDogeConfigs';
import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import GuardsEthereumConfigs from '../configs/guardsEthereumConfigs';
import { dataSource } from '../db/dataSource';
import { TokenHandler } from '../handlers/tokenHandler';

const logger = DefaultLogger.getInstance().child(import.meta.url);

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
  ergoScannerLogger: DefaultLogger.getInstance().child('ergo-scanner'),
  bitcoinCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'bitcoin-commitment-extractor',
  ),
  bitcoinEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
    'bitcoin-event-trigger-extractor',
  ),
  cardanoCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'cardano-commitment-extractor',
  ),
  cardanoEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
    'cardano-event-trigger-extractor',
  ),
  ergoCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'ergo-commitment-extractor',
  ),
  ergoEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
    'ergo-event-trigger-extractor',
  ),
  ethereumCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'ethereum-commitment-extractor',
  ),
  ethereumEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
    'ethereum-event-trigger-extractor',
  ),
  ethereumScannerLogger: DefaultLogger.getInstance().child('ethereum-scanner'),
  ethereumLockAddressTxExtractorLogger: DefaultLogger.getInstance().child(
    'ethereum-lock-address-tx-extractor',
  ),
  binanceCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'binance-commitment-extractor',
  ),
  binanceEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
    'binance-event-trigger-extractor',
  ),
  binanceScannerLogger: DefaultLogger.getInstance().child('binance-scanner'),
  binanceLockAddressTxExtractorLogger: DefaultLogger.getInstance().child(
    'binance-lock-address-tx-extractor',
  ),
  dogeCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'doge-commitment-extractor',
  ),
  dogeEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
    'doge-event-trigger-extractor',
  ),
  bitcoinRunesCommitmentExtractorLogger: DefaultLogger.getInstance().child(
    'bitcoin-runes-commitment-extractor',
  ),
  bitcoinRunesEventTriggerExtractorLogger: DefaultLogger.getInstance().child(
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
  const initialization = Configs.initializeEventTriggers;

  // init Bitcoin extractors
  const bitcoinCommitmentExtractor = new CommitmentExtractor(
    'bitcoinCommitment',
    [GuardsBitcoinConfigs.bitcoinContractConfig.addresses.Commitment],
    GuardsBitcoinConfigs.bitcoinContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.bitcoinCommitmentExtractorLogger,
  );
  const bitcoinEventTriggerExtractor = new EventTriggerExtractor(
    'bitcoinEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsBitcoinConfigs.bitcoinContractConfig.addresses.WatcherTriggerEvent,
    GuardsBitcoinConfigs.bitcoinContractConfig.tokens.RWTId,
    GuardsBitcoinConfigs.bitcoinContractConfig.addresses.WatcherPermit,
    GuardsBitcoinConfigs.bitcoinContractConfig.addresses.Fraud,
    loggers.bitcoinEventTriggerExtractorLogger,
    initialization,
  );

  // init Doge extractors
  const dogeCommitmentExtractor = new CommitmentExtractor(
    'dogeCommitment',
    [GuardsDogeConfigs.dogeContractConfig.addresses.Commitment],
    GuardsDogeConfigs.dogeContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.dogeCommitmentExtractorLogger,
  );

  const dogeEventTriggerExtractor = new EventTriggerExtractor(
    'dogeEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsDogeConfigs.dogeContractConfig.addresses.WatcherTriggerEvent,
    GuardsDogeConfigs.dogeContractConfig.tokens.RWTId,
    GuardsDogeConfigs.dogeContractConfig.addresses.WatcherPermit,
    GuardsDogeConfigs.dogeContractConfig.addresses.Fraud,
    loggers.dogeEventTriggerExtractorLogger,
    initialization,
  );

  // init Cardano extractors
  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [GuardsCardanoConfigs.cardanoContractConfig.addresses.Commitment],
    GuardsCardanoConfigs.cardanoContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.cardanoCommitmentExtractorLogger,
  );
  const cardanoEventTriggerExtractor = new EventTriggerExtractor(
    'cardanoEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsCardanoConfigs.cardanoContractConfig.addresses.WatcherTriggerEvent,
    GuardsCardanoConfigs.cardanoContractConfig.tokens.RWTId,
    GuardsCardanoConfigs.cardanoContractConfig.addresses.WatcherPermit,
    GuardsCardanoConfigs.cardanoContractConfig.addresses.Fraud,
    loggers.cardanoEventTriggerExtractorLogger,
    initialization,
  );

  // init Ergo extractors
  const ergoCommitmentExtractor = new CommitmentExtractor(
    'ergoCommitment',
    [GuardsErgoConfigs.ergoContractConfig.addresses.Commitment],
    GuardsErgoConfigs.ergoContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.ergoCommitmentExtractorLogger,
  );
  const ergoEventTriggerExtractor = new EventTriggerExtractor(
    'ergoEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsErgoConfigs.ergoContractConfig.addresses.WatcherTriggerEvent,
    GuardsErgoConfigs.ergoContractConfig.tokens.RWTId,
    GuardsErgoConfigs.ergoContractConfig.addresses.WatcherPermit,
    GuardsErgoConfigs.ergoContractConfig.addresses.Fraud,
    loggers.ergoEventTriggerExtractorLogger,
    initialization,
  );

  // init Ethereum extractors
  const ethereumCommitmentExtractor = new CommitmentExtractor(
    'ethereumCommitment',
    [GuardsEthereumConfigs.ethereumContractConfig.addresses.Commitment],
    GuardsEthereumConfigs.ethereumContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.ethereumCommitmentExtractorLogger,
  );
  const ethereumEventTriggerExtractor = new EventTriggerExtractor(
    'ethereumEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsEthereumConfigs.ethereumContractConfig.addresses.WatcherTriggerEvent,
    GuardsEthereumConfigs.ethereumContractConfig.tokens.RWTId,
    GuardsEthereumConfigs.ethereumContractConfig.addresses.WatcherPermit,
    GuardsEthereumConfigs.ethereumContractConfig.addresses.Fraud,
    loggers.ethereumEventTriggerExtractorLogger,
    initialization,
  );

  // init Binance extractors
  const binanceCommitmentExtractor = new CommitmentExtractor(
    'binanceCommitment',
    [GuardsBinanceConfigs.binanceContractConfig.addresses.Commitment],
    GuardsBinanceConfigs.binanceContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.binanceCommitmentExtractorLogger,
  );
  const binanceEventTriggerExtractor = new EventTriggerExtractor(
    'binanceEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsBinanceConfigs.binanceContractConfig.addresses.WatcherTriggerEvent,
    GuardsBinanceConfigs.binanceContractConfig.tokens.RWTId,
    GuardsBinanceConfigs.binanceContractConfig.addresses.WatcherPermit,
    GuardsBinanceConfigs.binanceContractConfig.addresses.Fraud,
    loggers.binanceEventTriggerExtractorLogger,
    initialization,
  );
  const bitcoinRunesCommitmentExtractor = new CommitmentExtractor(
    'bitcoinRunesCommitment',
    [GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.addresses.Commitment],
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.tokens.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.bitcoinRunesCommitmentExtractorLogger,
  );
  const bitcoinRunesEventTriggerExtractor = new EventTriggerExtractor(
    'bitcoinRunesEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.addresses.WatcherTriggerEvent,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.tokens.RWTId,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.addresses.WatcherPermit,
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.addresses.Fraud,
    loggers.bitcoinRunesEventTriggerExtractorLogger,
    initialization,
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
      GuardsEthereumConfigs.ethereumContractConfig.addresses.lock,
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
      GuardsBinanceConfigs.binanceContractConfig.addresses.lock,
      loggers.binanceLockAddressTxExtractorLogger,
    );
    binanceScanner.registerExtractor(BinanceAddressTxExtractor);
    // run Binance scanner job
    binanceScannerJob();
  }
};

export { initScanner };
