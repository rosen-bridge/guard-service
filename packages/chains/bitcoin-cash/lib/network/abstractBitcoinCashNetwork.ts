import {
  AbstractUtxoChainNetwork,
  TokenDetail,
} from '@rosen-chains/abstract-chain';

import BitcoinCashTransaction from '../bitcoinCashTransaction';
import { BitcoinCashTx, BitcoinCashUtxo } from '../chainTypes';
import { BitcoinCashPrevout } from '../types';

abstract class AbstractBitcoinCashNetwork extends AbstractUtxoChainNetwork<
  BitcoinCashTx,
  BitcoinCashUtxo
> {
  abstract submitTransaction: (
    transaction: BitcoinCashTransaction,
  ) => Promise<void>;
  abstract getUtxo: (boxId: string) => Promise<BitcoinCashUtxo | undefined>;
  abstract getTransactionHex: (txId: string) => Promise<string>;
  abstract getPrevout: (boxId: string) => Promise<BitcoinCashPrevout>;
  /** Bounded wallet-history lookup; bound exhaustion must throw, not return absence. */
  abstract findSignedTransaction: (
    unsignedBody: Uint8Array,
  ) => Promise<Uint8Array | undefined>;
  abstract isTxInMempool: (actualSignedTxId: string) => Promise<boolean>;

  getTokenDetail = async (_tokenId: string): Promise<TokenDetail> => {
    throw Error('Native BCH adapter does not support tokens');
  };

  getActualTxId = async (_approvalId: string): Promise<string> => {
    throw Error('BCH chain identity requires a verified signed envelope');
  };
}

export default AbstractBitcoinCashNetwork;
