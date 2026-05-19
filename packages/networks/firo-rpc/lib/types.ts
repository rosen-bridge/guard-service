export interface FiroBlockSummary {
  hash: string;
  height: number;
  time: number;
  previousblockhash: string;
  tx: Array<string>;
  confirmations: number;
  difficulty: number;
  merkleroot: string;
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

export interface FiroRpcTxInput {
  txid?: string; // Not present in coinbase transactions
  vout?: number; // Not present in coinbase transactions
  scriptSig?: {
    // Not present in coinbase transactions
    asm: string;
    hex: string;
  };
  sequence: number;
  coinbase?: string; // Only present in coinbase transactions
  txinwitness?: string[];
}

export interface FiroRpcTxOutput {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    addresses?: string[];
    reqSigs?: number;
  };
}

export interface FiroRpcTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<FiroRpcTxInput>;
  vout: Array<FiroRpcTxOutput>;
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

export interface FiroChainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  chainwork: string;
  size_on_disk: number;
  pruned: boolean;
  softforks: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  warnings: string;
}

export interface FiroRpcUtxo {
  address: string;
  txid: string;
  outputIndex: number;
  script: string;
  satoshis: number;
  height: number;
}

/**
 * Authentication credentials for Firocoin RPC
 */
export interface RpcAuth {
  username?: string;
  password?: string;
  apiKey?: string;
}
