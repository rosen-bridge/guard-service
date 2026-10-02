import { BitcoinCashRpcAssetHealthCheckParam } from '@rosen-bridge/asset-check';
import type { BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';

import type { BitcoinCashHealthPolicy } from '../configs/guardsBitcoinCashConfigs';

/** Adapts the guard policy to the shared native BCH asset health parameter. */
export class BitcoinCashHealthCheckParam extends BitcoinCashRpcAssetHealthCheckParam {
  /**
   * Creates the shared treasury monitor from validated guard configuration.
   * @param network BCHN provider that authenticates native treasury assets
   * @param address configured treasury CashAddr
   * @param policy warning and critical thresholds in native satoshis
   */
  constructor(
    network: Pick<BitcoinCashRpcNetwork, 'getAddressAssets'>,
    address: string,
    policy: BitcoinCashHealthPolicy,
  ) {
    super(network, address, policy.warnThreshold, policy.criticalThreshold);
  }
}
