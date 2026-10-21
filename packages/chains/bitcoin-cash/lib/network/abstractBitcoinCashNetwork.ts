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
  /**
   * Revalidate and submit exact signed envelope bytes to the configured BCH provider.
   * @param transaction - Fully signed native treasury envelope
   * @returns Completion after provider submission succeeds
   */
  abstract submitTransaction: (
    transaction: BitcoinCashTransaction,
  ) => Promise<void>;
  /**
   * Resolve current confirmed and mature native output context.
   * @param boxId - Canonical transaction-hash.output-index identifier
   * @returns The usable current output, or undefined when unavailable
   */
  abstract getUtxo: (boxId: string) => Promise<BitcoinCashUtxo | undefined>;
  /**
   * Resolve canonical raw bytes for a validated transaction identity.
   * @param txId - Canonical transaction hash
   * @returns Exact hexadecimal transaction bytes
   */
  abstract getTransactionHex: (txId: string) => Promise<string>;
  /**
   * Resolve parent-derived native output context independently of current spent status.
   * @param boxId - Canonical transaction-hash.output-index identifier
   * @returns Exact value, script and parent transaction bytes
   */
  abstract getPrevout: (boxId: string) => Promise<BitcoinCashPrevout>;
  /**
   * Search bounded wallet history for signed bytes matching an approved unsigned body.
   * @param unsignedBody - Canonical approved bytes with every input witness empty
   * @returns Matching candidate bytes, or undefined after a complete scan
   * @throws When bounds are exhausted or history cannot establish a stable complete result
   */
  abstract findSignedTransaction: (
    unsignedBody: Uint8Array,
  ) => Promise<Uint8Array | undefined>;
  /**
   * Query mempool membership using the actual signed transaction identity.
   * @param actualSignedTxId - Canonical signed transaction hash
   * @returns Whether the signed transaction is in the current mempool
   */
  abstract isTxInMempool: (actualSignedTxId: string) => Promise<boolean>;

  /**
   * Reject generic token lookup unless a concrete provider implements native metadata.
   * @param _tokenId - Requested asset identifier, unused by this unsupported default
   * @returns No metadata; the default implementation always throws
   * @throws Because the native-only base network does not implement token lookup
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Preserve the abstract asset-lookup signature.
  getTokenDetail = async (_tokenId: string): Promise<TokenDetail> => {
    throw Error('Native BCH adapter does not support tokens');
  };

  /**
   * Reject approval-hash-only lookup because signed identity requires retained context.
   * @param _approvalId - Rosen approval hash, unused by this unsupported lookup
   * @returns No transaction identity; this implementation always throws
   * @throws Because the network cannot reconstruct a verified envelope from an approval hash
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Preserve the abstract approval-lookup signature.
  getActualTxId = async (_approvalId: string): Promise<string> => {
    throw Error('BCH chain identity requires a verified signed envelope');
  };
}

export default AbstractBitcoinCashNetwork;
