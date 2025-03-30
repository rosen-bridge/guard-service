import {
  EsploraAssetHealthCheckParam,
  CardanoBlockFrostAssetHealthCheckParam,
  CardanoKoiosAssetHealthCheckParam,
  ErgoExplorerAssetHealthCheckParam,
  ErgoNodeAssetHealthCheckParam,
  EvmRpcAssetHealthCheckParam,
} from '@rosen-bridge/asset-check';
import { HealthCheck } from '@rosen-bridge/health-check';
import { ErgoNodeSyncHealthCheckParam } from '@rosen-bridge/node-sync-check';
import { P2PNetworkHealthCheck } from '@rosen-bridge/p2p-network-check';
import {
  ErgoExplorerScannerHealthCheck,
  ErgoNodeScannerHealthCheck,
  EvmRPCScannerHealthCheck,
} from '@rosen-bridge/scanner-sync-check';

import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { BLOCKFROST_NETWORK } from '@rosen-chains/cardano-blockfrost-network';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { EXPLORER_NETWORK } from '@rosen-chains/ergo-explorer-network';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import Dialer from '../communication/Dialer';
import Configs from '../configs/Configs';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { rosenConfig } from '../configs/RosenConfig';
import GuardPkHandler from '../handlers/GuardPkHandler';
import {
  ADA_DECIMALS,
  ERG_DECIMALS,
  EventStatus,
  ETHEREUM_BLOCK_TIME,
  BINANCE_BLOCK_TIME,
} from '../utils/constants';
import GuardsBitcoinConfigs from '../configs/GuardsBitcoinConfigs';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import GuardsDogeConfigs from '../configs/GuardsDogeConfigs';
import { DOGE, DOGE_CHAIN } from '@rosen-chains/doge';
import { DatabaseAction } from '../db/DatabaseAction';
import { NotFoundError } from '@rosen-chains/abstract-chain';
import { NotificationHandler } from '../handlers/NotificationHandler';
import {
  TxInfo,
  TxProgressHealthCheckParam,
} from '@rosen-bridge/tx-progress-check';
import GuardsEthereumConfigs from '../configs/GuardsEthereumConfigs';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import GuardsBinanceConfigs from '../configs/GuardsBinanceConfigs';
import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import {
  EventInfo,
  EventProgressHealthCheckParam,
} from '@rosen-bridge/event-progress-check';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);
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
      notificationConfig
    );

    // add P2PNetwork param
    const dialer = await Dialer.getInstance();
    const p2pHealthCheck = new P2PNetworkHealthCheck({
      defectConfirmationTimeWindow: Configs.p2pDefectConfirmationTimeWindow,
      connectedGuardsHealthyThreshold:
        GuardPkHandler.getInstance().requiredSign - 1,
      getConnectedGuards: () => {
        const connectedRelays = dialer.getRelayStates().connected?.length ?? 0;
        return dialer.getConnectedPeersCount() - connectedRelays;
      },
      getIsAtLeastOneRelayConnected: () => {
        return dialer.getRelayStates().connected?.length > 0 ?? 0;
      },
    });
    healthCheck.register(p2pHealthCheck);

    // add TxProgress param
    const getActiveTransactions = async (): Promise<TxInfo[]> => {
      return (await DatabaseAction.getInstance().getActiveTransactions()).map(
        (txEntity) => ({
          txId: txEntity.txId,
          txType: txEntity.type,
          signFailedCount: txEntity.signFailedCount,
          chain: txEntity.chain,
          eventId: txEntity.event?.id ?? '',
        })
      );
    };
    const txProgressHealthCheck = new TxProgressHealthCheckParam(
      getActiveTransactions,
      Configs.txSignFailedWarnThreshold,
      Configs.txSignFailedCriticalThreshold
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
      Configs.eventDurationCriticalThreshold
    );
    healthCheck.register(eventProgressHealthCheck);

    const ergoContracts = rosenConfig.contractReader(ERGO_CHAIN);
    const cardanoContracts = rosenConfig.contractReader(CARDANO_CHAIN);
    const bitcoinContracts = rosenConfig.contractReader(BITCOIN_CHAIN);
    const ethereumContracts = rosenConfig.contractReader(ETHEREUM_CHAIN);
    const binanceContracts = rosenConfig.contractReader(BINANCE_CHAIN);
    const dogeContracts = rosenConfig.contractReader(DOGE_CHAIN);
    const generateLastBlockFetcher = (scannerName: string) => {
      return async () => {
        try {
          return await DatabaseAction.getInstance().getLastSavedBlockForScanner(
            scannerName
          );
        } catch (e) {
          if (e instanceof NotFoundError) {
            logger.info(
              `No block found in database. Passing 0 as last height to HealthCheck`
            );
            return 0;
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
        ERG_DECIMALS
      );
      healthCheck.register(ergAssetHealthCheck);

      const emissionTokenAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        GuardsErgoConfigs.emissionTokenId,
        GuardsErgoConfigs.emissionTokenName,
        ergoContracts.lockAddress,
        Configs.emissionTokenWarnThreshold,
        Configs.emissionTokenCriticalThreshold,
        GuardsErgoConfigs.node.url,
        GuardsErgoConfigs.emissionTokenDecimal
      );
      healthCheck.register(emissionTokenAssetHealthCheck);

      const scannerName = 'ergo-node';
      const ergoScannerSyncCheck = new ErgoNodeScannerHealthCheck(
        generateLastBlockFetcher(scannerName),
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        GuardsErgoConfigs.node.url
      );
      healthCheck.register(ergoScannerSyncCheck);

      const ergoNodeSyncCheck = new ErgoNodeSyncHealthCheckParam(
        Configs.ergoNodeMaxHeightDiff,
        Configs.ergoNodeMaxBlockTime,
        Configs.ergoNodeMinPeerCount,
        Configs.ergoNodeMaxPeerHeightDifference,
        GuardsErgoConfigs.node.url
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
        ERG_DECIMALS
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
          GuardsErgoConfigs.emissionTokenDecimal
        );
      healthCheck.register(emissionTokenAssetHealthCheck);

      const scannerName = 'ergo-explorer';
      const ergoScannerSyncCheck = new ErgoExplorerScannerHealthCheck(
        generateLastBlockFetcher(scannerName),
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        GuardsErgoConfigs.explorer.url
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
        GuardsCardanoConfigs.koios.authToken
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
        GuardsCardanoConfigs.blockfrost.url
      );
      healthCheck.register(adaAssetHealthCheck);
    }
    if (GuardsBitcoinConfigs.chainNetworkName === 'esplora') {
      const btcAssetHealthCheck = new EsploraAssetHealthCheckParam(
        BTC,
        bitcoinContracts.lockAddress,
        Configs.btcWarnThreshold,
        Configs.btcCriticalThreshold,
        GuardsBitcoinConfigs.esplora.url,
        8
      );
      healthCheck.register(btcAssetHealthCheck);
    }
    if (GuardsDogeConfigs.chainNetworkName === 'esplora') {
      const dogeAssetHealthCheck = new EsploraAssetHealthCheckParam(
        DOGE,
        dogeContracts.lockAddress,
        Configs.dogeWarnThreshold,
        Configs.dogeCriticalThreshold,
        GuardsDogeConfigs.esplora.url,
        8
      );
      healthCheck.register(dogeAssetHealthCheck);
    }
    if (GuardsEthereumConfigs.chainNetworkName === 'rpc') {
      const ethAssetHealthCheck = new EvmRpcAssetHealthCheckParam(
        ETH,
        ETH,
        ETH,
        ethereumContracts.lockAddress,
        Configs.ethWarnThreshold,
        Configs.ethCriticalThreshold,
        GuardsEthereumConfigs.rpc.url,
        8,
        GuardsEthereumConfigs.rpc.authToken,
        18
      );
      healthCheck.register(ethAssetHealthCheck);

      const scannerName = 'ethereum-evm-rpc';
      const ethereumScannerSyncCheck = new EvmRPCScannerHealthCheck(
        ETHEREUM_CHAIN,
        generateLastBlockFetcher(scannerName),
        Configs.ethereumScannerWarnDiff,
        Configs.ethereumScannerCriticalDiff,
        GuardsEthereumConfigs.rpc.url,
        ETHEREUM_BLOCK_TIME,
        GuardsEthereumConfigs.rpc.authToken,
        GuardsEthereumConfigs.rpc.timeout
      );
      healthCheck.register(ethereumScannerSyncCheck);
    }
    if (GuardsBinanceConfigs.chainNetworkName === 'rpc') {
      const bnbAssetHealthCheck = new EvmRpcAssetHealthCheckParam(
        BNB,
        BNB,
        BNB,
        binanceContracts.lockAddress,
        Configs.bnbWarnThreshold,
        Configs.bnbCriticalThreshold,
        GuardsBinanceConfigs.rpc.url,
        8,
        GuardsBinanceConfigs.rpc.authToken,
        18
      );
      healthCheck.register(bnbAssetHealthCheck);

      const scannerName = 'binance-evm-rpc';
      const binanceScannerSyncCheck = new EvmRPCScannerHealthCheck(
        BINANCE_CHAIN,
        generateLastBlockFetcher(scannerName),
        Configs.binanceScannerWarnDiff,
        Configs.binanceScannerCriticalDiff,
        GuardsBinanceConfigs.rpc.url,
        BINANCE_BLOCK_TIME,
        GuardsBinanceConfigs.rpc.authToken,
        GuardsBinanceConfigs.rpc.timeout
      );
      healthCheck.register(binanceScannerSyncCheck);
    }
  }

  return healthCheck;
};

export { getHealthCheck };
