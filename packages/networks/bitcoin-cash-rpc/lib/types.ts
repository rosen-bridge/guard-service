export type BitcoinCashRpcChain = 'main' | 'test' | 'regtest';
export interface BitcoinCashRpcConfig {
  /** HTTP(S) endpoint without embedded credentials or a URL fragment. */
  url: string;
  /** Required reported BCHN chain identity; no chain is inferred from the URL. */
  expectedChain: BitcoinCashRpcChain;
  /** Optional Basic authentication retained inside the HTTP transport closure. */
  auth?: { username: string; password: string };
  /** Request timeout in milliseconds; defaults to 10000, with a maximum of 60000. */
  timeoutMs?: number;
  /** Response byte limit; defaults to 8000000, with a maximum of 64000000. */
  maxResponseBytes?: number;
  /** Wallet UTXO work limit; defaults to 1000, with a maximum of 10000. */
  maxUtxos?: number;
  /** Mempool identifier work limit; defaults to 1000, with a maximum of 10000. */
  maxMempoolTransactions?: number;
  /** Block transaction work limit; defaults to 10000, with a maximum of 100000. */
  maxBlockTransactions?: number;
  /** Recovery rows per page; defaults to 100, with a maximum of 500. */
  walletHistoryPageSize?: number;
  /** Recovery page work limit; defaults to 20, with a maximum of 100. */
  maxWalletHistoryPages?: number;
}
export interface RpcTransport {
  /**
   * Invoke one RPC method and return its validated envelope result.
   * @param method - BCHN RPC method name
   * @param params - Positional method arguments
   * @returns Result data requiring method-specific validation by the consumer
   */
  call(method: string, params: readonly unknown[]): Promise<unknown>;
}
