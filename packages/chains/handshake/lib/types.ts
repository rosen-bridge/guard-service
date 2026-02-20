import {
  ChainConfigs,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

export interface HandshakeConfigs extends ChainConfigs {
  aggregatedPublicKey: string; // Aggregated public key (TSS threshold signature scheme)
  txFeeSlippage: number; // Fee verification tolerance
  lockScript: string; // hex-encoded witnessScript for P2WSH multisig (32-byte witness program, hashed with SHA-256)
  requiredSign: number; // Number of signatures required for m-of-n multisig
}

export interface HandshakeTransactionJsonModel
  extends PaymentTransactionJsonModel {
  inputUtxos: Array<string>;
}

export interface HandshakeUtxo {
  txId: string;
  index: number;
  value: bigint;
}

export interface HandshakeTxInput {
  txId: string;
  index: number;
}

export interface HandshakeTxOutput {
  value: bigint;
  address: {
    version: number;
    hash: string;
    string: string;
  };
}

export interface HandshakeTx {
  id: string;
  inputs: HandshakeTxInput[];
  outputs: HandshakeTxOutput[];
}

export enum HandshakeNetworkFunction {
  // AbstractChainNetwork functions
  getHeight = 'getHeight',
  getTxConfirmation = 'getTxConfirmation',
  getAddressAssets = 'getAddressAssets',
  getBlockTransactionIds = 'getBlockTransactionIds',
  getBlockInfo = 'getBlockInfo',
  getTransaction = 'getTransaction',
  submitTransaction = 'submitTransaction',
  getActualTxId = 'getActualTxId',

  // AbstractUtxoChainNetwork functions
  getAddressBoxes = 'getAddressBoxes',
  isBoxUnspentAndValid = 'isBoxUnspentAndValid',

  // AbstractHandshakeNetwork specific functions
  getUtxo = 'getUtxo',
  getFeeRatio = 'getFeeRatio',
  getMempoolTxIds = 'getMempoolTxIds',
}
