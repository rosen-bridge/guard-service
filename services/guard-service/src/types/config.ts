import { SUPPORTED_CHAINS } from '../utils/constants';

export interface BalanceHandlerChainConfig {
  updateInterval: number;
  updateBatchInterval: number;
  tokensPerIteration: Record<string, number>;
}
export type BalanceHandlerConfig = Record<string, BalanceHandlerChainConfig>;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];
