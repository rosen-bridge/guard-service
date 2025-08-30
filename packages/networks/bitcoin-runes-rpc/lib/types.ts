export interface JsonRpcResult<Result> {
  result: Result;
  error: any;
  id: string;
}

// New Types

export interface BitcoinRpcChainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  bits: string;
  target: string;
  difficulty: number;
  time: string;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  chainwork: string;
  size_on_disk: number;
  pruned: boolean;
  warnings: string;
}

export interface BitcoinRpcTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: BitcoinRpcVin[];
  vout: BitcoinRpcVout[];
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface BitcoinRpcVin {
  txid: string;
  vout: number;
  scriptSig: BitcoinRpcScriptSig;
  txinwitness: string[];
  sequence: number;
}

export interface BitcoinRpcScriptSig {
  asm: string;
  hex: string;
}

export interface BitcoinRpcVout {
  value: number;
  n: number;
  scriptPubKey: BitcoinRpcScriptPubKey;
}

export interface BitcoinRpcScriptPubKey {
  asm: string;
  desc: string;
  hex: string;
  address: string;
  type: string;
}

export interface BitcoinRpcBlockSummary {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  target: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  nextblockhash: string;
  strippedsize: number;
  size: number;
  weight: number;
  tx: string[];
}

export interface BitcoinRpcUtxo {
  bestblock: string;
  confirmations: number;
  value: number;
  scriptPubKey: BitcoinRpcScriptPubKey;
  coinbase: boolean;
}

export interface BitcoinRpcFeeRate {
  feerate: number;
  blocks: number;
}

export interface BitcoinRpcMempoolEntry {
  vsize: number;
  weight: number;
  time: number;
  height: number;
  descendantcount: number;
  descendantsize: number;
  ancestorcount: number;
  ancestorsize: number;
  wtxid: string;
  fees: BitcoinRpcMempoolFees;
  depends: string[];
  spentby: string[];
  'bip125-replaceable': boolean;
  unbroadcast: boolean;
}

export interface BitcoinRpcMempoolFees {
  base: number;
  modified: number;
  ancestor: number;
  descendant: number;
}

export interface UnisatResponse<Data> {
  code: number;
  msg?: string;
  data: Data;
}

export interface UnisatAddressBalance {
  address: string;
  satoshi: number;
  pendingSatoshi: number;
  utxoCount: number;
  btcSatoshi: number;
  btcPendingSatoshi: number;
  btcUtxoCount: number;
  inscriptionSatoshi: number;
  inscriptionPendingSatoshi: number;
  inscriptionUtxoCount: number;
}

export interface UnisatAddressRunesBalance {
  detail: UnisatRunesDetail[];
  height: number;
  start: number;
  total: number;
}

export interface UnisatRunesDetail {
  rune: string;
  runeid: string;
  spacedRune: string;
  amount: string;
  symbol: string;
  divisibility: number;
}

export interface UnisatTxRunes {
  detail: UnisatBoxDetail[];
  height: number;
  start: number;
  total: number;
}

export interface UnisatAddressRunesUtxos {
  utxo: UnisatRunesUtxo[];
  height: number;
  start: number;
  total: number;
}

export interface UnisatRunesUtxo {
  height: number;
  confirmations: number;
  address: string;
  satoshi: number;
  scriptPk: string;
  txid: string;
  vout: number;
  runes: UnisatRunesDetail[];
}

export interface UnisatAddressBtcUtxos {
  cursor: number;
  total: number;
  utxo: UnisatBtcUtxo[];
}

export interface UnisatBtcUtxo {
  confirmations: number;
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
  inscriptionsCount: number;
  inscriptions: UnisatInscriptionItem[];
}

export interface UnisatInscriptionItem {
  inscriptionId: string;
  inscriptionNumber: number;
  isBRC20: boolean;
  moved: boolean;
  offset: number;
}

export interface UnisatBoxDetail {
  type: string;
  address: string;
  amount: string;
  height: number;
  txidx: number;
  txid: string;
  timestamp: number;
  runeId: string;
  rune: string;
  spacedRune: string;
  divisibility: number;
  vout: number;
  spentTxid: string;
  spentVout: number;
}

export interface UnisatRunesInfo {
  runeid: string;
  rune: string;
  spacedRune: string;
  number: number;
  height: number;
  txidx: number;
  timestamp: number;
  divisibility: number;
  symbol: string;
  etching: string;
  premine: string;
  terms: UnisatRunesTerms;
  mints: string;
  burned: string;
  holders: number;
  transactions: number;
  supply: string;
  start: number;
  end: number;
  mintable: boolean;
  remaining: string;
  anHourMints: number;
  sixHourMints: number;
  oneDayMints: number;
  sevenDayMints: number;
  progress: number;
}

export interface UnisatRunesTerms {
  amount: string;
  cap: string;
  heightStart: number;
  heightEnd: number;
  offsetStart: number;
  offsetEnd: number;
}

export interface RpcConfig {
  url: string;
  rpcUsername?: string;
  rpcPassword?: string;
  rpcApiKey?: string;
}

export interface UnisatConfig {
  url: string;
  unisatApiKey?: string;
}
