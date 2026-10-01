import {
  AbstractHealthCheckParam,
  HealthStatusLevel,
} from '@rosen-bridge/health-check';
import { BCH_MAX_MONEY } from '@rosen-chains/bitcoin-cash';
import type { BitcoinCashRpcNetwork } from '@rosen-chains/bitcoin-cash-rpc';

import type { BitcoinCashHealthPolicy } from '../configs/guardsBitcoinCashConfigs';

/** Treasury health is measured in native satoshis, independently of TokenMap. */
export class BitcoinCashHealthCheckParam extends AbstractHealthCheckParam {
  private balance?: bigint;
  private readonly warnThreshold: bigint;
  private readonly criticalThreshold: bigint;

  constructor(
    private readonly network: Pick<BitcoinCashRpcNetwork, 'getAddressAssets'>,
    private readonly address: string,
    policy: BitcoinCashHealthPolicy,
  ) {
    super();
    if (
      typeof policy.warnThreshold !== 'bigint' ||
      typeof policy.criticalThreshold !== 'bigint' ||
      policy.criticalThreshold < 0n ||
      policy.warnThreshold > BCH_MAX_MONEY ||
      policy.criticalThreshold > policy.warnThreshold
    )
      throw Error('Invalid BCH health thresholds');
    this.warnThreshold = policy.warnThreshold;
    this.criticalThreshold = policy.criticalThreshold;
  }

  getId = (): string => `asset_bch_${this.address}`;
  getTitle = (): string => '[bitcoin-cash] Available BCH Balance';
  getDescription = (): string =>
    this.balance === undefined
      ? 'Native BCH treasury balance is unknown.'
      : `Native BCH treasury balance is ${this.balance} satoshis.`;
  getDetails = (): string | undefined => {
    if (this.balance === undefined)
      return 'BCH treasury balance is unavailable.';
    if (this.balance < this.criticalThreshold)
      return `BCH treasury balance is below the critical threshold of ${this.criticalThreshold} satoshis.`;
    if (this.balance < this.warnThreshold)
      return `BCH treasury balance is below the warning threshold of ${this.warnThreshold} satoshis.`;
    return undefined;
  };
  getHealthStatus = (): HealthStatusLevel => {
    if (this.balance === undefined || this.balance < this.criticalThreshold)
      return HealthStatusLevel.BROKEN;
    if (this.balance < this.warnThreshold) return HealthStatusLevel.UNSTABLE;
    return HealthStatusLevel.HEALTHY;
  };
  updateStatus = async (): Promise<void> => {
    this.balance = undefined;
    try {
      const assets = await this.network.getAddressAssets(this.address);
      if (
        typeof assets.nativeToken !== 'bigint' ||
        assets.nativeToken < 0n ||
        assets.nativeToken > BCH_MAX_MONEY ||
        !Array.isArray(assets.tokens) ||
        assets.tokens.length !== 0
      )
        throw Error('Invalid native BCH balance');
      this.balance = assets.nativeToken;
    } catch {
      // RPC errors may contain endpoint credentials or server-provided data.
      throw Error('BCH treasury balance update failed');
    }
  };
}
