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
   * gets id of transactions in mempool
   * @returns
   */
  abstract getMempoolTxIds: () => Promise<Array<string>>;

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
}

export default AbstractBitcoinRunesNetwork;
