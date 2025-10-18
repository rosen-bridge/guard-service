import {
  EsploraAssetHealthCheckParam,
  CardanoBlockFrostAssetHealthCheckParam,
  CardanoKoiosAssetHealthCheckParam,
  ErgoExplorerAssetHealthCheckParam,
  ErgoNodeAssetHealthCheckParam,
  EvmRpcAssetHealthCheckParam,
} from '@rosen-bridge/asset-check';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import {
  EventInfo,
  EventProgressHealthCheckParam,
} from '@rosen-bridge/event-progress-check';
import { HealthCheck } from '@rosen-bridge/health-check';
import { ErgoNodeSyncHealthCheckParam } from '@rosen-bridge/node-sync-check';
import { ScannerSyncHealthCheckParam } from '@rosen-bridge/scanner-sync-check';
import { LastSavedBlock } from '@rosen-bridge/scanner-sync-check/dist/config';
import {
  TxInfo,
  TxProgressHealthCheckParam,
} from '@rosen-bridge/tx-progress-check';
import { NotFoundError } from '@rosen-chains/abstract-chain';
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
  ERG_DECIMALS,
  EventStatus,
  ETHEREUM_BLOCK_TIME,
  BINANCE_BLOCK_TIME,
  ERGO_BLOCK_TIME,
} from '../utils/constants';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);
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
    const ethereumContracts = rosenConfig.contractReader(ETHEREUM_CHAIN);
    const binanceContracts = rosenConfig.contractReader(BINANCE_CHAIN);
    // We skipped Doge AssetCheck parameter, so we don't need it's contracts here
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
        ergoContracts.lockAddress,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        GuardsErgoConfigs.node.url,
        ERG_DECIMALS,
      );
      healthCheck.register(ergAssetHealthCheck);

      const emissionTokenAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        GuardsErgoConfigs.emissionTokenId,
        GuardsErgoConfigs.emissionTokenName,
        ergoContracts.lockAddress,
        Configs.emissionTokenWarnThreshold,
        Configs.emissionTokenCriticalThreshold,
        GuardsErgoConfigs.node.url,
        GuardsErgoConfigs.emissionTokenDecimal,
      );
      healthCheck.register(emissionTokenAssetHealthCheck);

      const scannerName = 'ergo-node';
      const ergoScannerSyncCheck = new ScannerSyncHealthCheckParam(
        ERGO_CHAIN,
        generateLastBlockFetcher(scannerName),
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
        ergoContracts.lockAddress,
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
          ergoContracts.lockAddress,
          Configs.emissionTokenWarnThreshold,
          Configs.emissionTokenCriticalThreshold,
          GuardsErgoConfigs.explorer.url,
          GuardsErgoConfigs.emissionTokenDecimal,
        );
      healthCheck.register(emissionTokenAssetHealthCheck);

      const scannerName = 'ergo-explorer';
      const ergoScannerSyncCheck = new ScannerSyncHealthCheckParam(
        ERGO_CHAIN,
        generateLastBlockFetcher(scannerName),
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
        cardanoContracts.lockAddress,
        Configs.adaWarnThreshold,
        Configs.adaCriticalThreshold,
        GuardsCardanoConfigs.koios.url,
        ADA_DECIMALS,
        GuardsCardanoConfigs.koios.authToken,
      );
      healthCheck.register(adaAssetHealthCheck);
    }
    // TODO: Use OGMIOS_NETWORK constant exported from cardano-ogmios-network in rosen-chains
    // https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/250
    else if (GuardsCardanoConfigs.chainNetworkName === 'ogmios') {
      // TODO: Asset health check with ogmios
      // https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/249
    } else if (GuardsCardanoConfigs.chainNetworkName === BLOCKFROST_NETWORK) {
      const adaAssetHealthCheck = new CardanoBlockFrostAssetHealthCheckParam(
        ADA,
        ADA,
        cardanoContracts.lockAddress,
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
        bitcoinContracts.lockAddress,
        Configs.btcWarnThreshold,
        Configs.btcCriticalThreshold,
        GuardsBitcoinConfigs.esplora.url,
        8,
      );
      healthCheck.register(btcAssetHealthCheck);
      // register BTC asset-check on Bitcoin Runes lock address
      const btcRunesAssetHealthCheck = new EsploraAssetHealthCheckParam(
        BITCOIN_CHAIN,
        BTC,
        bitcoinRunesContracts.lockAddress,
        Configs.btcWarnThreshold,
        Configs.btcCriticalThreshold,
        GuardsBitcoinConfigs.esplora.url,
        8,
      );
      healthCheck.register(btcRunesAssetHealthCheck);
    }
    if (GuardsEthereumConfigs.chainNetworkName === 'rpc') {
      const ethAssetHealthCheck = new EvmRpcAssetHealthCheckParam(
        ETHEREUM_CHAIN,
        ETH,
        ETH,
        ETH,
        ethereumContracts.lockAddress,
        Configs.ethWarnThreshold,
        Configs.ethCriticalThreshold,
        GuardsEthereumConfigs.rpc.url,
        8,
        GuardsEthereumConfigs.rpc.authToken,
        18,
      );
      healthCheck.register(ethAssetHealthCheck);

      const scannerName = 'ethereum-evm-rpc';
      const ethereumScannerSyncCheck = new ScannerSyncHealthCheckParam(
        ETHEREUM_CHAIN,
        generateLastBlockFetcher(scannerName),
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
        binanceContracts.lockAddress,
        Configs.bnbWarnThreshold,
        Configs.bnbCriticalThreshold,
        GuardsBinanceConfigs.rpc.url,
        8,
        GuardsBinanceConfigs.rpc.authToken,
        18,
      );
      healthCheck.register(bnbAssetHealthCheck);

      const scannerName = 'binance-evm-rpc';
      const binanceScannerSyncCheck = new ScannerSyncHealthCheckParam(
        BINANCE_CHAIN,
        generateLastBlockFetcher(scannerName),
        Configs.binanceScannerWarnDiff,
        Configs.binanceScannerCriticalDiff,
        BINANCE_BLOCK_TIME,
        GuardsBinanceConfigs.rpc.scannerInterval,
      );
      healthCheck.register(binanceScannerSyncCheck);
    }
  }

  return healthCheck;
};

export { getHealthCheck };
