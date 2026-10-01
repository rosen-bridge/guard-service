export type BitcoinCashRpcChain = 'main' | 'test' | 'regtest';
export interface BitcoinCashRpcConfig {
  url: string;
  expectedChain: BitcoinCashRpcChain;
  auth?: { username: string; password: string };
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxUtxos?: number;
  maxMempoolTransactions?: number;
  maxBlockTransactions?: number;
  walletHistoryPageSize?: number;
  maxWalletHistoryPages?: number;
}
export interface RpcTransport {
  call(method: string, params: readonly unknown[]): Promise<unknown>;
}
