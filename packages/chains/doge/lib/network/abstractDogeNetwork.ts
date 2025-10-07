import {
  AbstractUtxoChainNetwork,
  TokenDetail,
} from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';

import { DogeTx, DogeUtxo } from '../types';

abstract class AbstractDogeNetwork extends AbstractUtxoChainNetwork<
  DogeTx,
  DogeUtxo
> {
  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: Psbt) => Promise<void>;

  /**
   * gets a utxo from the network
   * @param boxId the id of Utxo (txId + . + index)
   * @returns the utxo in DogeUtxo format
   */
  abstract getUtxo: (boxId: string) => Promise<DogeUtxo>;

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
   * Note: due to heavy size of transactions in mempool, we ignore getting mempool txs in Doge
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<DogeTx>> => {
    return [];
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    throw Error(`Doge does not support token`);
  };

  /**
   * gets a transaction hex string
   * @param txId the transaction id
   * @returns hex string of the transaction
   */
  abstract getTransactionHex: (txId: string) => Promise<string>;
}

export default AbstractDogeNetwork;
