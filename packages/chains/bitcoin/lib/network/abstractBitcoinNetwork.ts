import {
  AbstractUtxoChainNetwork,
  TokenDetail,
} from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';

import { BitcoinTx, BitcoinUtxo } from '../types';

abstract class AbstractBitcoinNetwork extends AbstractUtxoChainNetwork<
  BitcoinTx,
  BitcoinUtxo
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
  abstract getUtxo: (boxId: string) => Promise<BitcoinUtxo>;

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
  getMempoolTransactions = async (): Promise<Array<BitcoinTx>> => {
    return [];
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    throw Error(`Bitcoin does not support token`);
  };

  /**
   * gets the actual id of a transaction by its hash
   * @param hash
   */
  getActualTxId = async (hash: string): Promise<string> => hash;
}

export default AbstractBitcoinNetwork;
