export type BalanceHandlerConfig = {
  ergo: {
    updateInterval: number;
    updateBatchInterval: number;
    updateBatchMaxRetries: number;
    tokensPerMinute: {
      node: number;
      explorer: number;
    };
  };
  cardano: {
    updateInterval: number;
    updateBatchInterval: number;
    updateBatchMaxRetries: number;
    tokensPerMinute: {
      blockfrost: number;
      koios: number;
    };
  };
  bitcoin: {
    updateInterval: number;
    updateBatchInterval: number;
    updateBatchMaxRetries: number;
    tokensPerMinute: {
      esplora: number;
    };
  };
  doge: {
    updateInterval: number;
    updateBatchInterval: number;
    updateBatchMaxRetries: number;
    tokensPerMinute: {
      esplora: number;
      blockcypher: number;
    };
  };
  ethereum: {
    updateInterval: number;
    updateBatchInterval: number;
    updateBatchMaxRetries: number;
    tokensPerMinute: {
      rpc: number;
    };
  };
  binance: {
    updateInterval: number;
    updateBatchInterval: number;
    updateBatchMaxRetries: number;
    tokensPerMinute: {
      rpc: number;
    };
  };
};
