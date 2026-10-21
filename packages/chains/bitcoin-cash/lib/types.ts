import { decodeTransactionBCH } from '@bitauth/libauth';

export type BitcoinCashRawTransaction = Exclude<
  ReturnType<typeof decodeTransactionBCH>,
  string
>;

/** Exact parent bytes authenticate value, script and token absence. */
export interface BitcoinCashPrevout {
  txId: string;
  index: number;
  value: bigint;
  scriptPubKey: string;
  parentTransactionHex: string;
}

export interface BitcoinCashPrevoutJson {
  txId: string;
  index: number;
  value: string;
  scriptPubKey: string;
  parentTransactionHex: string;
}
