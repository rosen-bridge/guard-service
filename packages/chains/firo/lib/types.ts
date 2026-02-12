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

export enum FiroNetworkFunction {
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

  // AbstractFiroNetwork specific functions
  getUtxo = 'getUtxo',
  getFeeRatio = 'getFeeRatio',
  isTxInMempool = 'isTxInMempool',
  getTransactionHex = 'getTransactionHex',
}
