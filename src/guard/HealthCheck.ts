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
} from '@rosen-bridge/health-check';
import { dataSource } from '../../config/dataSource';
import { loggerFactory } from '../log/Logger';
import Configs from '../helpers/Configs';
import GuardsErgoConfigs from '../helpers/GuardsErgoConfigs';
import ChainsConstants from '../chains/ChainsConstants';
import { rosenConfig } from '../helpers/RosenConfig';
import ergoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import Dialer from '../communication/Dialer';
import { guardConfig } from '../helpers/GuardConfig';

const logger = loggerFactory(import.meta.url);
let healthCheck: HealthCheck | undefined;

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
      defectConfirmationTimeWindowMs: Configs.p2pDefectConfirmationTimeWindowMs,
      connectedGuardsHealthyPercentThreshold: guardConfig.requiredSign - 1,
      getConnectedGuardsPercent: () => {
        const connectedRelays = dialer.getRelayStates().connected?.length ?? 0;
        return dialer.getConnectedPeersCount() - connectedRelays;
      },
      getIsAtLeastOneRelayConnected: () => {
        return dialer.getRelayStates().connected?.length > 0 ?? 0;
      },
    });
    healthCheck.register(p2pHealthCheck);

    const ergoContracts = rosenConfig.contractReader(ChainsConstants.ergo);
    if (GuardsErgoConfigs.chainNetworkName === ChainsConstants.ergoNodeType) {
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
    } else if (
      GuardsErgoConfigs.chainNetworkName === ChainsConstants.ergoExplorerType
    ) {
      const ergAssetHealthCheck = new ErgoExplorerAssetHealthCheckParam(
        ChainsConstants.ergoNativeAsset,
        ChainsConstants.ergoNativeAsset,
        ergoContracts.lockAddress,
        Configs.ergWarnThreshold,
        Configs.ergCriticalThreshold,
        ergoConfigs.node.url
      );
      healthCheck.register(ergAssetHealthCheck);

      const rsnAssetHealthCheck = new ErgoExplorerAssetHealthCheckParam(
        rosenConfig.RSN,
        'RSN',
        ergoContracts.lockAddress,
        Configs.rsnWarnThreshold,
        Configs.rsnCriticalThreshold,
        ergoConfigs.node.url
      );
      healthCheck.register(rsnAssetHealthCheck);

      const ergoScannerSyncCheck = new ErgoExplorerScannerHealthCheck(
        dataSource,
        'ergo-explorer',
        Configs.ergoScannerWarnDiff,
        Configs.ergoScannerCriticalDiff,
        ergoConfigs.node.url
      );
      healthCheck.register(ergoScannerSyncCheck);
    }
  }
  return healthCheck;
};

export { getHealthCheck };
