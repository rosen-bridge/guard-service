export interface HandshakeBlockSummary {
  hash: string;
  height: number;
  time: number;
  previousblockhash: string;
  tx: Array<string>;
  confirmations: number;
  difficulty: number;
  merkleroot: string;
  witnessroot: string;
  treeroot: string;
  nonce: number;
  size: number;
  weight: number;
  version: number;
  versionHex: string;
  chainwork: string;
  bits: string;
  mediantime: number;
  nextblockhash?: string;
}

export interface HandshakeRpcTxInput {
  txid: string;
  vout: number;
  scriptSig?: {
    asm: string;
    hex: string;
  };
  txinwitness?: string[];
  sequence: number;
  coinbase?: boolean;
}

export interface HandshakeRpcTxOutput {
  value: number;
  n: number;
  address?: {
    version: number;
    hash: string;
    string: string;
  };
  covenant: {
    type: number;
    action: string;
    items: string[];
  };
}

export interface HandshakeRpcTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<HandshakeRpcTxInput>;
  vout: Array<HandshakeRpcTxOutput>;
  hex?: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

/**
 * error object hsd returns in the body of a failed JSON-RPC call
 */
export interface JsonRpcError {
  code: number;
  message: string;
}

export interface JsonRpcResult<Result> {
  result: Result;
  error: JsonRpcError | null;
  id: string;
}

export interface HandshakeChainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  treeroot: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  chainwork: string;
  pruned: boolean;
  softforks: Record<string, unknown>;
  deflationary: boolean;
  pruneheight: number | null;
}

/**
 * Coin object returned by the /coin/address endpoint
 */
export interface HandshakeCoin {
  version: number;
  height: number; // -1 while the coin is in the mempool
  value: number; // in dollarydoos, unlike the RPC outputs which are in HNS
  address: string;
  covenant: {
    type: number;
    action: string;
    items: string[];
  };
  coinbase: boolean;
  hash: string; // transaction ID
  index: number; // output index
}

/**
 * Authentication credentials for Handshake RPC
 */
export interface RpcAuth {
  username?: string;
  password?: string;
  apiKey?: string;
}
