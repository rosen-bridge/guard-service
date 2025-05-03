export interface DogeBlockSummary {
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

export interface DogeRpcTxInput {
    txid: string;
    vout: number;
    scriptSig: {
        asm: string;
        hex: string;
    };
    sequence: number;
    coinbase?: string;
    txinwitness?: string[];
}

export interface DogeRpcTxOutput {
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

export interface DogeRpcTransaction {
    txid: string;
    hash: string;
    version: number;
    size: number;
    vsize: number;
    weight: number;
    locktime: number;
    vin: Array<DogeRpcTxInput>;
    vout: Array<DogeRpcTxOutput>;
    hex?: string;
    blockhash?: string;
    confirmations?: number;
    time?: number;
    blocktime?: number;
    blockheight?: number;
}

export interface JsonRpcResult {
    result: any;
    error: any;
    id: string;
}

export interface DogeChainInfo {
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
    softforks: Record<string, any>;
    warnings: string;
}

export interface DogeUtxo {
    txid: string;
    vout: number;
    address: string;
    scriptPubKey: string;
    amount: number;
    confirmations: number;
    spendable: boolean;
    solvable: boolean;
    safe: boolean;
} 