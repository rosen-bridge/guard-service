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
  blockheight?: number;
}

export interface JsonRpcResult {
  result: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  softforks: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  deflationary: boolean;
  pruneheight: number | null;
}

/**
 * Authentication credentials for Handshake RPC
 */
export interface RpcAuth {
  username?: string;
  password?: string;
  apiKey?: string;
}
