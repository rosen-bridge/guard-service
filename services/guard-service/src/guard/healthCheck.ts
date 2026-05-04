import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  EsploraAssetHealthCheckParam,
  CardanoBlockFrostAssetHealthCheckParam,
  CardanoKoiosAssetHealthCheckParam,
  ErgoExplorerAssetHealthCheckParam,
  ErgoNodeAssetHealthCheckParam,
  EvmRpcAssetHealthCheckParam,
} from '@rosen-bridge/asset-check';
import {
  EventInfo,
  EventProgressHealthCheckParam,
} from '@rosen-bridge/event-progress-check';
import { HealthCheck, HealthStatusLevel } from '@rosen-bridge/health-check';
import { LogLevelHealthCheck } from '@rosen-bridge/log-level-check';
import { ErgoNodeSyncHealthCheckParam } from '@rosen-bridge/node-sync-check';
import { ScannerSyncHealthCheckParam } from '@rosen-bridge/scanner-sync-check';
import { LastSavedBlock } from '@rosen-bridge/scanner-sync-check';
import {
  TxInfo,
  TxProgressHealthCheckParam,
} from '@rosen-bridge/tx-progress-check';
import { NotFoundError } from '@rosen-chains/abstract-chain';
import { BASE_CHAIN, ETH as BASE_ETH } from '@rosen-chains/base';
import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { BITCOIN_RUNES_CHAIN } from '@rosen-chains/bitcoin-runes';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { BLOCKFROST_NETWORK } from '@rosen-chains/cardano-blockfrost-network';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { EXPLORER_NETWORK } from '@rosen-chains/ergo-explorer-network';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';

import Configs from '../configs/configs';
import GuardsBaseConfigs from '../configs/guardsBaseConfigs';
import GuardsBinanceConfigs from '../configs/guardsBinanceConfigs';
import GuardsBitcoinConfigs from '../configs/guardsBitcoinConfigs';
import GuardsCardanoConfigs from '../configs/guardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import GuardsEthereumConfigs from '../configs/guardsEthereumConfigs';
import { rosenConfig } from '../configs/rosenConfig';
import { DatabaseAction } from '../db/databaseAction';
import { NotificationHandler } from '../handlers/notificationHandler';
import {
  ADA_DECIMALS,
  BASE_BLOCK_TIME,
  ERG_DECIMALS,
  EventStatus,
  ETHEREUM_BLOCK_TIME,
  BINANCE_BLOCK_TIME,
  ERGO_BLOCK_TIME,
} from '../utils/constants';

const logger = DefaultLogger.getInstance().child(import.meta.url);
let healthCheck: HealthCheck | undefined;

/**
 * Returns the instance of the health check with all required parameters
 * @returns healthCheck instance
 */
const getHealthCheck = async () => {
  if (!healthCheck) {
    // initialize HealthCheck
    const notificationHandler = NotificationHandler.getInstance();
    const notificationConfig = {
      historyConfig: {
        cleanupThreshold: Configs.historyCleanupThreshold,
      },
      notificationCheckConfig: {
        hasBeenUnstableForAWhile: {
          windowDuration: Configs.hasBeenUnstableForAWhileWindowDuration,
        },
        hasBeenUnknownForAWhile: {
          windowDuration: Configs.hasBeenUnknownForAWhileWindowDuration,
        },
        isStillUnhealthy: {
          windowDuration: Configs.isStillUnhealthyWindowDuration,
        },
      },
    };
    healthCheck = new HealthCheck(
      notificationHandler.notify,
      notificationConfig,
    );

    // TODO: local:ergo/rosen-bridge/health-check/55
    //  should replace p2p healthcheck param with detected active guards in detection scenario

    // add TxProgress param
    const getActiveTransactions = async (): Promise<TxInfo[]> => {
      return (await DatabaseAction.getInstance().getActiveTransactions()).map(
        (txEntity) => ({
          txId: txEntity.txId,
          txType: txEntity.type,
          signFailedCount: txEntity.signFailedCount,
          chain: txEntity.chain,
          eventId: txEntity.event?.id ?? '',
        }),
      );
    };
    const txProgressHealthCheck = new TxProgressHealthCheckParam(
      getActiveTransactions,
      Configs.txSignFailedWarnThreshold,
      Configs.txSignFailedCriticalThreshold,
    );
    healthCheck.register(txProgressHealthCheck);

    // add EventProgress param
    const getActiveEvents = async (): Promise<EventInfo[]> => {
      return (
        await DatabaseAction.getInstance().getEventsByStatuses([
          EventStatus.pendingPayment,
          EventStatus.pendingReward,
        ])
      ).map((eventEntity) => ({
        id: eventEntity.id,
        firstTry: eventEntity.firstTry,
        status: eventEntity.status,
      }));
    };
    const eventProgressHealthCheck = new EventProgressHealthCheckParam(
      getActiveEvents,
      Configs.eventDurationWarnThreshold,
      Configs.eventDurationCriticalThreshold,
    );
    healthCheck.register(eventProgressHealthCheck);

    const ergoContracts = rosenConfig.contractReader(ERGO_CHAIN);
    const cardanoContracts = rosenConfig.contractReader(CARDANO_CHAIN);
    const bitcoinContracts = rosenConfig.contractReader(BITCOIN_CHAIN);
    const baseContracts = rosenConfig.contractReader(BASE_CHAIN);
    const ethereumContracts = rosenConfig.contractReader(ETHEREUM_CHAIN);
    const binanceContracts = rosenConfig.contractReader(BINANCE_CHAIN);
    // We skipped Doge and Firo AssetCheck parameters, so we don't need their contracts here
    const bitcoinRunesContracts =
      rosenConfig.contractReader(BITCOIN_RUNES_CHAIN);

    const generateLastBlockFetcher = (scannerName: string) => {
      return async (): Promise<LastSavedBlock> => {
        try {
          return await DatabaseAction.getInstance().getLastSavedBlockForScanner(
            scannerName,
          );
        } catch (e) {
          if (e instanceof NotFoundError) {
            logger.info(
              `No block found in database. Passing 0 as last height to HealthCheck`,
            );
            return {
              height: 0,
              timestamp: 0,
            };
          } else throw e;
        }
      };
    };

    if (GuardsErgoConfigs.chainNetworkName === NODE_NETWORK) {
      const ergAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        ERG,
        ERG,
        ergoContracts.addresses.lock,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        GuardsErgoConfigs.node.url,
        ERG_DECIMALS,
      );
      healthCheck.register(ergAssetHealthCheck);

      const emissionTokenAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        GuardsErgoConfigs.emissionTokenId,
        GuardsErgoConfigs.emissionTokenName,
        ergoContracts.addresses.lock,
        Configs.emissionTokenWarnThreshold,
        Configs.emissionTokenCriticalThreshold,
        GuardsErgoConfigs.node.url,
        GuardsErgoConfigs.emissionTokenDecimal,
      );
      healthCheck.register(emissionTokenAssetHealthCheck);

      const ergoScannerSyncCheck = new ScannerSyncHealthCheckParam(
        ERGO_CHAIN,
        generateLastBlockFetcher(ERGO_CHAIN),
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        ERGO_BLOCK_TIME,
        GuardsErgoConfigs.scannerInterval,
      );
      healthCheck.register(ergoScannerSyncCheck);

      const ergoNodeSyncCheck = new ErgoNodeSyncHealthCheckParam(
        Configs.ergoNodeMaxHeightDiff,
        Configs.ergoNodeMaxBlockTime,
        Configs.ergoNodeMinPeerCount,
        Configs.ergoNodeMaxPeerHeightDifference,
        GuardsErgoConfigs.node.url,
      );
      healthCheck.register(ergoNodeSyncCheck);
    } else if (GuardsErgoConfigs.chainNetworkName === EXPLORER_NETWORK) {
      const ergAssetHealthCheck = new ErgoExplorerAssetHealthCheckParam(
        ERG,
        ERG,
        ergoContracts.addresses.lock,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        GuardsErgoConfigs.explorer.url,
        ERG_DECIMALS,
      );
      healthCheck.register(ergAssetHealthCheck);

      const emissionTokenAssetHealthCheck =
        new ErgoExplorerAssetHealthCheckParam(
          GuardsErgoConfigs.emissionTokenId,
          GuardsErgoConfigs.emissionTokenName,
          ergoContracts.addresses.lock,
          Configs.emissionTokenWarnThreshold,
          Configs.emissionTokenCriticalThreshold,
          GuardsErgoConfigs.explorer.url,
          GuardsErgoConfigs.emissionTokenDecimal,
        );
      healthCheck.register(emissionTokenAssetHealthCheck);

      const ergoScannerSyncCheck = new ScannerSyncHealthCheckParam(
        ERGO_CHAIN,
        generateLastBlockFetcher(ERGO_CHAIN),
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        ERGO_BLOCK_TIME,
        GuardsErgoConfigs.scannerInterval,
      );
      healthCheck.register(ergoScannerSyncCheck);
    }
    if (GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK) {
      const adaAssetHealthCheck = new CardanoKoiosAssetHealthCheckParam(
        ADA,
        ADA,
        cardanoContracts.addresses.lock,
        Configs.adaWarnThreshold,
        Configs.adaCriticalThreshold,
        GuardsCardanoConfigs.koios.url,
        ADA_DECIMALS,
        GuardsCardanoConfigs.koios.authToken,
      );
      healthCheck.register(adaAssetHealthCheck);
    } else if (GuardsCardanoConfigs.chainNetworkName === BLOCKFROST_NETWORK) {
      const adaAssetHealthCheck = new CardanoBlockFrostAssetHealthCheckParam(
        ADA,
        ADA,
        cardanoContracts.addresses.lock,
        Configs.adaWarnThreshold,
        Configs.adaCriticalThreshold,
        GuardsCardanoConfigs.blockfrost.projectId,
        ADA_DECIMALS,
        GuardsCardanoConfigs.blockfrost.url,
      );
      healthCheck.register(adaAssetHealthCheck);
    }
    if (GuardsBitcoinConfigs.chainNetworkName === 'esplora') {
      // register BTC asset-check on Bitcoin lock address
      const btcAssetHealthCheck = new EsploraAssetHealthCheckParam(
        BITCOIN_CHAIN,
        BTC,
        bitcoinContracts.addresses.lock,
        Configs.btcWarnThreshold,
        Configs.btcCriticalThreshold,
        GuardsBitcoinConfigs.esplora.url,
        8,
      );
      healthCheck.register(btcAssetHealthCheck);
      // register BTC asset-check on Bitcoin Runes lock address
      const btcRunesAssetHealthCheck = new EsploraAssetHealthCheckParam(
        BITCOIN_RUNES_CHAIN,
        BTC,
        bitcoinRunesContracts.addresses.lock,
        Configs.btcWarnThreshold,
        Configs.btcCriticalThreshold,
        GuardsBitcoinConfigs.esplora.url,
        8,
      );
      healthCheck.register(btcRunesAssetHealthCheck);
    }
    if (GuardsBaseConfigs.chainNetworkName === 'rpc') {
      const baseAssetHealthCheck = new EvmRpcAssetHealthCheckParam(
        BASE_CHAIN,
        BASE_ETH,
        BASE_ETH,
        BASE_ETH,
        baseContracts.addresses.lock,
        Configs.baseWarnThreshold,
        Configs.baseCriticalThreshold,
        GuardsBaseConfigs.rpc.url,
        8,
        GuardsBaseConfigs.rpc.authToken,
        18,
      );
      healthCheck.register(baseAssetHealthCheck);

      const baseScannerSyncCheck = new ScannerSyncHealthCheckParam(
        BASE_CHAIN,
        generateLastBlockFetcher(BASE_CHAIN),
        Configs.baseScannerWarnDiff,
        Configs.baseScannerCriticalDiff,
        BASE_BLOCK_TIME,
        GuardsBaseConfigs.rpc.scannerInterval,
      );
      healthCheck.register(baseScannerSyncCheck);
    }
    if (GuardsEthereumConfigs.chainNetworkName === 'rpc') {
      const ethAssetHealthCheck = new EvmRpcAssetHealthCheckParam(
        ETHEREUM_CHAIN,
        ETH,
        ETH,
        ETH,
        ethereumContracts.addresses.lock,
        Configs.ethWarnThreshold,
        Configs.ethCriticalThreshold,
        GuardsEthereumConfigs.rpc.url,
        8,
        GuardsEthereumConfigs.rpc.authToken,
        18,
      );
      healthCheck.register(ethAssetHealthCheck);

      const ethereumScannerSyncCheck = new ScannerSyncHealthCheckParam(
        ETHEREUM_CHAIN,
        generateLastBlockFetcher(ETHEREUM_CHAIN),
        Configs.ethereumScannerWarnDiff,
        Configs.ethereumScannerCriticalDiff,
        ETHEREUM_BLOCK_TIME,
        GuardsEthereumConfigs.rpc.scannerInterval,
      );
      healthCheck.register(ethereumScannerSyncCheck);
    }
    if (GuardsBinanceConfigs.chainNetworkName === 'rpc') {
      const bnbAssetHealthCheck = new EvmRpcAssetHealthCheckParam(
        BINANCE_CHAIN,
        BNB,
        BNB,
        BNB,
        binanceContracts.addresses.lock,
        Configs.bnbWarnThreshold,
        Configs.bnbCriticalThreshold,
        GuardsBinanceConfigs.rpc.url,
        8,
        GuardsBinanceConfigs.rpc.authToken,
        18,
      );
      healthCheck.register(bnbAssetHealthCheck);

      const binanceScannerSyncCheck = new ScannerSyncHealthCheckParam(
        BINANCE_CHAIN,
        generateLastBlockFetcher(BINANCE_CHAIN),
        Configs.binanceScannerWarnDiff,
        Configs.binanceScannerCriticalDiff,
        BINANCE_BLOCK_TIME,
        GuardsBinanceConfigs.rpc.scannerInterval,
      );
      healthCheck.register(binanceScannerSyncCheck);
    }
  }

  // add LogLevel param
  const warnLogCheck = new LogLevelHealthCheck(
    HealthStatusLevel.UNSTABLE,
    Configs.warnLogAllowedCount,
    Configs.logDuration,
    'warn',
  );
  healthCheck.register(warnLogCheck);
  const errorLogCheck = new LogLevelHealthCheck(
    HealthStatusLevel.UNSTABLE,
    Configs.errorLogAllowedCount,
    Configs.logDuration,
    'error',
  );
  healthCheck.register(errorLogCheck);

  return healthCheck;
};

export { getHealthCheck };
