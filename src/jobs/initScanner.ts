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
import GuardsDogeConfigs from '../configs/GuardsDogeConfigs';
import Configs from '../configs/Configs';
import GuardsEthereumConfigs from '../configs/GuardsEthereumConfigs';
import { EvmRpcScanner } from '@rosen-bridge/evm-rpc-scanner';
import { EvmTxExtractor } from '@rosen-bridge/evm-address-tx-extractor';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import GuardsBinanceConfigs from '../configs/GuardsBinanceConfigs';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { TokenHandler } from '../handlers/tokenHandler';
import GuardsBitcoinRunesConfigs from '../configs/GuardsBitcoinRunesConfigs';
import GuardsHandshakeConfigs from '../configs/GuardsHandshakeConfigs';

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
  binanceCommitmentExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'binance-commitment-extractor'
    ),
  binanceEventTriggerExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'binance-event-trigger-extractor'
    ),
  binanceScannerLogger:
    DefaultLoggerFactory.getInstance().getLogger('binance-scanner'),
  binanceLockAddressTxExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'binance-lock-address-tx-extractor'
    ),
  dogeCommitmentExtractorLogger: DefaultLoggerFactory.getInstance().getLogger(
    'doge-commitment-extractor'
  ),
  dogeEventTriggerExtractorLogger: DefaultLoggerFactory.getInstance().getLogger(
    'doge-event-trigger-extractor'
  ),
  bitcoinRunesCommitmentExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'bitcoin-runes-commitment-extractor'
    ),
  bitcoinRunesEventTriggerExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'bitcoin-runes-event-trigger-extractor'
    ),
  handshakeCommitmentExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'handshake-commitment-extractor'
    ),
  handshakeEventTriggerExtractorLogger:
    DefaultLoggerFactory.getInstance().getLogger(
      'handshake-event-trigger-extractor'
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

  const networkType =
    GuardsErgoConfigs.chainNetworkName === ErgoNetworkType.Node
      ? ErgoNetworkType.Node
      : ErgoNetworkType.Explorer;
  const networkUrl =
    networkType === ErgoNetworkType.Node
      ? GuardsErgoConfigs.node.url
      : GuardsErgoConfigs.explorer.url;
  const bitcoinCommitmentExtractor = new CommitmentExtractor(
    'bitcoinCommitment',
    [GuardsBitcoinConfigs.bitcoinContractConfig.commitmentAddress],
    GuardsBitcoinConfigs.bitcoinContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.bitcoinCommitmentExtractorLogger
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
    loggers.bitcoinEventTriggerExtractorLogger
  );

  const dogeCommitmentExtractor = new CommitmentExtractor(
    'dogeCommitment',
    [GuardsDogeConfigs.dogeContractConfig.commitmentAddress],
    GuardsDogeConfigs.dogeContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.dogeCommitmentExtractorLogger
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
    loggers.dogeEventTriggerExtractorLogger
  );

  const cardanoCommitmentExtractor = new CommitmentExtractor(
    'cardanoCommitment',
    [GuardsCardanoConfigs.cardanoContractConfig.commitmentAddress],
    GuardsCardanoConfigs.cardanoContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.cardanoCommitmentExtractorLogger
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
    loggers.cardanoEventTriggerExtractorLogger
  );

  const ergoCommitmentExtractor = new CommitmentExtractor(
    'ergoCommitment',
    [GuardsErgoConfigs.ergoContractConfig.commitmentAddress],
    GuardsErgoConfigs.ergoContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.ergoCommitmentExtractorLogger
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
    loggers.ergoEventTriggerExtractorLogger
  );

  const ethereumCommitmentExtractor = new CommitmentExtractor(
    'ethereumCommitment',
    [GuardsEthereumConfigs.ethereumContractConfig.commitmentAddress],
    GuardsEthereumConfigs.ethereumContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.ethereumCommitmentExtractorLogger
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
    loggers.ethereumEventTriggerExtractorLogger
  );

  const binanceCommitmentExtractor = new CommitmentExtractor(
    'binanceCommitment',
    [GuardsBinanceConfigs.binanceContractConfig.commitmentAddress],
    GuardsBinanceConfigs.binanceContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.binanceCommitmentExtractorLogger
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
    loggers.binanceEventTriggerExtractorLogger
  );
  const bitcoinRunesCommitmentExtractor = new CommitmentExtractor(
    'bitcoinRunesCommitment',
    [GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.commitmentAddress],
    GuardsBitcoinRunesConfigs.bitcoinRunesContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.bitcoinRunesCommitmentExtractorLogger
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
    loggers.bitcoinRunesEventTriggerExtractorLogger
  );

  const handshakeCommitmentExtractor = new CommitmentExtractor(
    'handshakeCommitment',
    [GuardsHandshakeConfigs.handshakeContractConfig.commitmentAddress],
    GuardsHandshakeConfigs.handshakeContractConfig.RWTId,
    dataSource,
    TokenHandler.getInstance().getTokenMap(),
    loggers.handshakeCommitmentExtractorLogger
  );
  const handshakeEventTriggerExtractor = new EventTriggerExtractor(
    'handshakeEventTrigger',
    dataSource,
    networkType,
    networkUrl,
    GuardsHandshakeConfigs.handshakeContractConfig.eventTriggerAddress,
    GuardsHandshakeConfigs.handshakeContractConfig.RWTId,
    GuardsHandshakeConfigs.handshakeContractConfig.permitAddress,
    GuardsHandshakeConfigs.handshakeContractConfig.fraudAddress,
    loggers.handshakeEventTriggerExtractorLogger
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
  ergoScanner.registerExtractor(handshakeCommitmentExtractor);
  ergoScanner.registerExtractor(handshakeEventTriggerExtractor);

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
