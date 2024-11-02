import {
  ChainConfigs,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

export interface DogeConfigs extends ChainConfigs {
  aggregatedPublicKey: string;
  txFeeSlippage: number;
}

export interface DogeTransactionJsonModel extends PaymentTransactionJsonModel {
  inputUtxos: Array<string>;
}

export interface DogeUtxo {
  txId: string;
  index: number;
  value: bigint;
  txHex?: string;
}

export interface DogeTxInput {
  txId: string;
  index: number;
  scriptPubKey: string;
}

export interface DogeTxOutput {
  scriptPubKey: string;
  value: bigint;
}

export interface DogeTx {
  id: string;
  inputs: DogeTxInput[];
  outputs: DogeTxOutput[];
}

export interface BoxInfo {
  id: string;
  assets: AssetBalance;
}

export interface TokenInfo {
  id: string;
  value: bigint;
}

export interface AssetBalance {
  nativeToken: bigint;
  tokens: Array<TokenInfo>;
}

export interface CoveringBoxes<BoxType> {
  covered: boolean;
  boxes: Array<BoxType>;
}

export type TssSignFunction = (txHash: Uint8Array) => Promise<{
  signature: string;
  signatureRecovery: string;
}>;
