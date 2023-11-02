import {
  ErgoExplorerAssetHealthCheckParam,
  ErgoExplorerScannerHealthCheck,
  ErgoNodeAssetHealthCheckParam,
  ErgoNodeScannerHealthCheck,
  ErgoNodeSyncHealthCheckParam,
  P2PNetworkHealthCheck,
  HealthCheck,
  HealthStatusLevel,
  LogLevelHealthCheck,
  CardanoAssetHealthCheckParam,
} from '@rosen-bridge/health-check';
import { dataSource } from '../db/dataSource';
import Configs from '../configs/Configs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { rosenConfig } from '../configs/RosenConfig';
import Dialer from '../communication/Dialer';
import CommunicationConfig from '../communication/CommunicationConfig';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { EXPLORER_NETWORK } from '@rosen-chains/ergo-explorer-network';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);
let healthCheck: HealthCheck | undefined;

/**
 * Returns the instance of the health check with all required parameters
 * @returns healthCheck instance
 */
const getHealthCheck = async () => {
  if (!healthCheck) {
    healthCheck = new HealthCheck();

    const errorLogHealthCheck = new LogLevelHealthCheck(
      logger,
      HealthStatusLevel.UNSTABLE,
      Configs.errorLogAllowedCount,
      Configs.errorLogDuration,
      'error'
    );
    healthCheck.register(errorLogHealthCheck);
    const dialer = await Dialer.getInstance();

    const p2pHealthCheck = new P2PNetworkHealthCheck({
      defectConfirmationTimeWindow: Configs.p2pDefectConfirmationTimeWindow,
      connectedGuardsHealthyThreshold: CommunicationConfig.guardsCount - 1,
      getConnectedGuards: () => {
        const connectedRelays = dialer.getRelayStates().connected?.length ?? 0;
        return dialer.getConnectedPeersCount() - connectedRelays;
      },
      getIsAtLeastOneRelayConnected: () => {
        return dialer.getRelayStates().connected?.length > 0 ?? 0;
      },
    });
    healthCheck.register(p2pHealthCheck);

    const ergoContracts = rosenConfig.contractReader(ERGO_CHAIN);
    const cardanoContracts = rosenConfig.contractReader(CARDANO_CHAIN);
    if (GuardsErgoConfigs.chainNetworkName === NODE_NETWORK) {
      const ergAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        ERG,
        ERG,
        ergoContracts.lockAddress,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        GuardsErgoConfigs.node.url
      );
      healthCheck.register(ergAssetHealthCheck);

      const rsnAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        rosenConfig.RSN,
        'RSN',
        ergoContracts.lockAddress,
        Configs.rsnWarnThreshold,
        Configs.rsnCriticalThreshold,
        GuardsErgoConfigs.node.url
      );
      healthCheck.register(rsnAssetHealthCheck);

      const ergoScannerSyncCheck = new ErgoNodeScannerHealthCheck(
        dataSource,
        'ergo-node',
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
        GuardsErgoConfigs.explorer.url
      );
      healthCheck.register(ergAssetHealthCheck);

      const rsnAssetHealthCheck = new ErgoExplorerAssetHealthCheckParam(
        rosenConfig.RSN,
        'RSN',
        ergoContracts.lockAddress,
        Configs.rsnWarnThreshold,
        Configs.rsnCriticalThreshold,
        GuardsErgoConfigs.explorer.url
      );
      healthCheck.register(rsnAssetHealthCheck);

      const ergoScannerSyncCheck = new ErgoExplorerScannerHealthCheck(
        dataSource,
        'ergo-explorer',
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        GuardsErgoConfigs.explorer.url
      );
      healthCheck.register(ergoScannerSyncCheck);
    }
    if (GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK) {
      const adaAssetHealthCheck = new CardanoAssetHealthCheckParam(
        ADA,
        ADA,
        cardanoContracts.lockAddress,
        Configs.adaWarnThreshold,
        Configs.adaCriticalThreshold,
        GuardsCardanoConfigs.koios.url
      );
      healthCheck.register(adaAssetHealthCheck);
    }
    // TODO: Use OGMIOS_NETWORK constant exported from cardano-ogmios-network in rosen-chains
    // https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/250
    else if (GuardsCardanoConfigs.chainNetworkName === 'ogmios') {
      // TODO: Asset health check with ogmios
      // https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/249
    }
  }

  return healthCheck;
};

export { getHealthCheck };
