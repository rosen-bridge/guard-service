interface Threshold {
  low: bigint;
  high: bigint;
}

interface ChainThresholds {
  [key: string]: Threshold;
}

interface ThresholdConfig {
  [key: string]: ChainThresholds;
}

export { Threshold, ChainThresholds, ThresholdConfig };
