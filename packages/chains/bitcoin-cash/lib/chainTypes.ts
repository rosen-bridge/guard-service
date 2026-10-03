import { BitcoinCashRpcTransaction } from '@rosen-bridge/rosen-extractor/dist/bitcoinCash.js';
import { ChainConfigs } from '@rosen-chains/abstract-chain';

import { BitcoinCashPrevout } from './types';

export interface BitcoinCashConfigs extends ChainConfigs {
  aggregatedPublicKey: string;
  /** Fixed positive integer satoshis per serialized legacy byte. */
  feeRate: number;
  maxFee: bigint;
  minimumUtxoValue: bigint;
  maxUtxoPages: number;
}

export interface BitcoinCashUtxo extends BitcoinCashPrevout {
  confirmations: number;
  coinbase: boolean;
}

/** Raw bytes, rather than a lossy RPC projection, authenticate event outputs. */
export type BitcoinCashTx = BitcoinCashRpcTransaction;
