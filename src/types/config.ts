export interface BalanceHandlerChainConfig {
  updateInterval: number;
  updateBatchInterval: number;
  tokensPerIteration: Record<string, number>;
}
export type BalanceHandlerConfig = Record<string, BalanceHandlerChainConfig>;
