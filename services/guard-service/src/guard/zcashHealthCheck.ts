import { ZcashRpcAssetHealthCheckParam } from '@rosen-bridge/asset-check';
import {
  AbstractHealthCheckParam,
  HealthStatusLevel,
} from '@rosen-bridge/health-check';

export interface ZcashNodeStatus {
  readonly height: number;
}

export type ReadZcashNodeStatus = () => Promise<ZcashNodeStatus>;

export interface ZcashAssetHealthCheckOptions {
  readonly address: string;
  readonly warnThreshold: bigint;
  readonly criticalThreshold: bigint;
  readonly rpcUrl: string;
  readonly rpcUsername?: string;
  readonly rpcPassword?: string;
}

export interface ZcashHealthCheckRegistrar {
  register(param: AbstractHealthCheckParam): void;
}

/** Checks RPC reachability and whether the observed tip continues to advance. */
export class ZcashNodeHealthCheckParam extends AbstractHealthCheckParam {
  private status = HealthStatusLevel.BROKEN;
  private details = 'Zcash node has not returned a valid height yet.';
  private observedHeight?: number;
  private observedAt?: number;

  constructor(
    private readonly readNodeStatus: ReadZcashNodeStatus,
    private readonly maximumNoProgressSeconds: number,
    private readonly now: () => number = Date.now,
  ) {
    super();
    if (
      !Number.isSafeInteger(maximumNoProgressSeconds) ||
      maximumNoProgressSeconds <= 0 ||
      maximumNoProgressSeconds > Number.MAX_SAFE_INTEGER / 1000
    )
      throw Error('maximumNoProgressSeconds must be a positive safe integer');
  }

  getId = () => 'zcash-node';
  getTitle = () => 'Zcash node';
  getDescription = () =>
    'Checks Zcash RPC reachability and whether its reported tip advances.';

  updateStatus = async () => {
    let height: number;
    let currentTime: number;
    try {
      const status = await this.readNodeStatus();
      height = status.height;
      currentTime = this.now();
      if (!Number.isSafeInteger(height) || height < 0)
        throw Error('invalid Zcash node height');
      if (!Number.isFinite(currentTime)) throw Error('invalid clock');
    } catch {
      this.observedHeight = undefined;
      this.observedAt = undefined;
      this.status = HealthStatusLevel.BROKEN;
      this.details = 'Zcash RPC is unavailable or returned an invalid height.';
      return this.status;
    }

    if (this.observedHeight === undefined || this.observedAt === undefined) {
      this.recordHealthyHeight(height, currentTime);
      return this.status;
    }

    if (currentTime < this.observedAt) {
      this.observedHeight = height;
      this.observedAt = currentTime;
      this.status = HealthStatusLevel.UNSTABLE;
      this.details =
        'Local clock moved backwards; waiting for a fresh Zcash tip observation.';
      return this.status;
    }

    if (height !== this.observedHeight) {
      this.recordHealthyHeight(height, currentTime);
      return this.status;
    }

    if (currentTime - this.observedAt >= this.maximumNoProgressSeconds * 1000) {
      this.status = HealthStatusLevel.UNSTABLE;
      this.details =
        'Zcash node tip has not advanced within the configured interval.';
      return this.status;
    }

    this.status = HealthStatusLevel.HEALTHY;
    this.details = `Zcash node reported height ${height}.`;
    return this.status;
  };

  getHealthStatus = () => this.status;
  getDetails = () => this.details;

  private recordHealthyHeight = (height: number, currentTime: number) => {
    this.observedHeight = height;
    this.observedAt = currentTime;
    this.status = HealthStatusLevel.HEALTHY;
    this.details = `Zcash node reported height ${height}.`;
  };
}

/** Registers the node check and, when configured, the transparent reserve check. */
export const registerZcashHealthChecks = (
  registrar: ZcashHealthCheckRegistrar,
  readNodeStatus: ReadZcashNodeStatus,
  maximumNoProgressSeconds: number,
  asset?: ZcashAssetHealthCheckOptions,
) => {
  registrar.register(
    new ZcashNodeHealthCheckParam(readNodeStatus, maximumNoProgressSeconds),
  );
  if (asset) {
    registrar.register(
      new ZcashRpcAssetHealthCheckParam(
        'ZEC',
        asset.address,
        asset.warnThreshold,
        asset.criticalThreshold,
        asset.rpcUrl,
        asset.rpcUsername,
        asset.rpcPassword,
        8,
      ),
    );
  }
};
