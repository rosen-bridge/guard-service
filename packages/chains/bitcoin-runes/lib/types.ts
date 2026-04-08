import {
  ChainConfigs,
  PaymentTransactionJsonModel,
} from '@rosen-chains/abstract-chain';

export interface BitcoinRunesConfigs extends ChainConfigs {
  aggregatedPublicKey: string;
  txFeeSlippage: number;
}

export interface BitcoinTransactionJsonModel
  extends PaymentTransactionJsonModel {
  inputUtxos: Array<string>;
}

export interface BitcoinRunesAssets {
  runeId: string;
  quantity: bigint;
}

export interface BitcoinRunesUtxo {
  txId: string;
  index: number;
  value: bigint;
  runes: Array<BitcoinRunesAssets>;
}

export interface BitcoinRunesTxInput {
  txId: string;
  index: number;
  scriptPubKey: string;
}

export interface BitcoinRunesTxOutput {
  scriptPubKey: string;
  value: bigint;
  runes: Array<BitcoinRunesAssets>;
}

export interface BitcoinRunesTx {
  id: string;
  inputs: BitcoinRunesTxInput[];
  outputs: BitcoinRunesTxOutput[];
}
