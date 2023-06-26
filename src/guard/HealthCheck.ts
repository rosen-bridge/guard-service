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
import { dataSource } from '../../config/dataSource';
import { loggerFactory } from '../log/Logger';
import Configs from '../helpers/Configs';
import GuardsErgoConfigs from '../helpers/GuardsErgoConfigs';
import ChainsConstants from '../chains/ChainsConstants';
import { rosenConfig } from '../helpers/RosenConfig';
import ergoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import Dialer from '../communication/Dialer';
import CommunicationConfig from '../communication/CommunicationConfig';
import GuardsCardanoConfigs from '../helpers/GuardsCardanoConfigs';
import CardanoConfigs from '../chains/cardano/helpers/CardanoConfigs';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { EXPLORER_NETWORK } from '@rosen-chains/ergo-explorer-network';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';

const logger = loggerFactory(import.meta.url);
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

    const ergoContracts = rosenConfig.contractReader(ChainsConstants.ergo);
    const cardanoContracts = rosenConfig.contractReader(
      ChainsConstants.cardano
    );
    if (GuardsErgoConfigs.chainNetworkName === NODE_NETWORK) {
      const ergAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        ChainsConstants.ergoNativeAsset,
        ChainsConstants.ergoNativeAsset,
        ergoContracts.lockAddress,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        ergoConfigs.node.url
      );
      healthCheck.register(ergAssetHealthCheck);

      const rsnAssetHealthCheck = new ErgoNodeAssetHealthCheckParam(
        rosenConfig.RSN,
        'RSN',
        ergoContracts.lockAddress,
        Configs.rsnWarnThreshold,
        Configs.rsnCriticalThreshold,
        ergoConfigs.node.url
      );
      healthCheck.register(rsnAssetHealthCheck);

      const ergoScannerSyncCheck = new ErgoNodeScannerHealthCheck(
        dataSource,
        'ergo-node',
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        ergoConfigs.node.url
      );
      healthCheck.register(ergoScannerSyncCheck);

      const ergoNodeSyncCheck = new ErgoNodeSyncHealthCheckParam(
        Configs.ergoNodeMaxHeightDiff,
        Configs.ergoNodeMaxBlockTime,
        Configs.ergoNodeMinPeerCount,
        Configs.ergoNodeMaxPeerHeightDifference,
        ergoConfigs.node.url
      );
      healthCheck.register(ergoNodeSyncCheck);
    } else if (GuardsErgoConfigs.chainNetworkName === EXPLORER_NETWORK) {
      const ergAssetHealthCheck = new ErgoExplorerAssetHealthCheckParam(
        ChainsConstants.ergoNativeAsset,
        ChainsConstants.ergoNativeAsset,
        ergoContracts.lockAddress,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        ergoConfigs.explorer.url
      );
      healthCheck.register(ergAssetHealthCheck);

      const rsnAssetHealthCheck = new ErgoExplorerAssetHealthCheckParam(
        rosenConfig.RSN,
        'RSN',
        ergoContracts.lockAddress,
        Configs.rsnWarnThreshold,
        Configs.rsnCriticalThreshold,
        ergoConfigs.explorer.url
      );
      healthCheck.register(rsnAssetHealthCheck);

      const ergoScannerSyncCheck = new ErgoExplorerScannerHealthCheck(
        dataSource,
        'ergo-explorer',
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        ergoConfigs.explorer.url
      );
      healthCheck.register(ergoScannerSyncCheck);
    }
    if (GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK) {
      const adaAssetHealthCheck = new CardanoAssetHealthCheckParam(
        ChainsConstants.cardanoNativeAsset,
        ChainsConstants.cardanoNativeAsset,
        cardanoContracts.lockAddress,
        Configs.adaWarnThreshold,
        Configs.adaCriticalThreshold,
        CardanoConfigs.koios.url
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
