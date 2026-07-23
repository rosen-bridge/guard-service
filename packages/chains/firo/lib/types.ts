import {
  ChainConfigs,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

export interface FiroConfigs extends ChainConfigs {
  aggregatedPublicKey: string;
  txFeeSlippage: number;
}

export interface FiroTransactionJsonModel extends PaymentTransactionJsonModel {
  inputUtxos: Array<string>;
}

export interface FiroUtxo {
  txId: string;
  index: number;
  value: bigint;
}

export interface FiroTxInput {
  txId: string;
  index: number;
  scriptPubKey: string;
}

export interface FiroTxOutput {
  scriptPubKey: string;
  value: bigint;
}

export interface FiroTx {
  id: string;
  inputs: FiroTxInput[];
  outputs: FiroTxOutput[];
}
