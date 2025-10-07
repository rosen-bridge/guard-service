import { AbstractUtxoChainNetwork } from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';

import { BitcoinRunesTx, BitcoinRunesUtxo } from '../types';

abstract class AbstractBitcoinRunesNetwork extends AbstractUtxoChainNetwork<
  BitcoinRunesTx,
  BitcoinRunesUtxo
> {
  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: Psbt) => Promise<void>;

  /**
   * gets a utxo from the network
   * @param boxId the id of Utxo (txId + . + index)
   * @returns the utxo in BitcoinUtxo format
   */
  abstract getUtxo: (boxId: string) => Promise<BitcoinRunesUtxo>;

  /**
   * gets current fee ratio of the network
   * @returns
   */
  abstract getFeeRatio: () => Promise<number>;

  /**
   * checks if a transaction is in mempool
   * @param txId the transaction id
   * @returns true if the transaction is in mempool, false otherwise
   */
  abstract isTxInMempool: (txId: string) => Promise<boolean>;

  /**
   * gets all transactions in mempool (returns empty list if the chain has no mempool)
   * Note: due to heavy size of transactions in mempool, we ignore getting mempool txs in Bitcoin
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<BitcoinRunesTx>> => {
    return [];
  };

  /**
   * gets the actual id of a transaction by its hash
   * @param hash
   */
  getActualTxId = async (hash: string): Promise<string> => hash;

  /**
   * gets confirmed and unspent boxes of an address
   *
   * Note: This function is not implemented for any network of BitcoinRunesChain and should not be used!
   * @param address the address
   * @param offset
   * @param limit
   * @returns list of boxes
   */
  getAddressBoxes = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number,
  ): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error(
      `The "getAddressBoxes" is not implemented for any network of "BitcoinRunesChain" and should not be used!`,
    );
  };

  /**
   * gets confirmed and unspent boxes of an address that contains given rune
   * @param address the address
   * @param runeId the rune ID
   * @param offset
   * @param limit
   * @returns list of boxes
   */
  abstract getAddressRunesBoxes: (
    address: string,
    runeId: string,
    offset: number,
    limit: number,
  ) => Promise<Array<BitcoinRunesUtxo>>;

  /**
   * gets confirmed and unspent boxes of an address that contains no rune
   * @param address the address
   * @returns list of boxes
   */
  abstract getAddressBtcBoxes: (
    address: string,
  ) => Promise<Array<BitcoinRunesUtxo>>;

  /**
   * gets confirmed and unspent boxes of an address that are not fetched yet
   *
   * Note: this function ignores the `fetchedBoxIds`, meaning it does not
   * return it nor fetch its Runes balance
   * @param fetchedBoxIds the list of fetched box IDs
   * @param address the address
   * @returns list of boxes
   */
  abstract getRemainingBoxes: (
    fetchedBoxIds: Array<string>,
    address: string,
  ) => Promise<Array<BitcoinRunesUtxo>>;
}

export default AbstractBitcoinRunesNetwork;
