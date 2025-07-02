export interface BalanceHandlerChainConfig {
  updateInterval?: number;
  updateBatchInterval?: number;
  tokensPerMinute?: Record<string, number>;
}
export type BalanceHandlerConfig = Record<string, BalanceHandlerChainConfig>;
