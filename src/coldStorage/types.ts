interface Threshold {
  low: bigint;
  high: bigint;
}

interface ChainThresholds {
  maxNativeTransfer: bigint;
  tokens: Record<string, Threshold>;
}

interface ThresholdConfig {
  [key: string]: ChainThresholds;
}

export { Threshold, ChainThresholds, ThresholdConfig };
