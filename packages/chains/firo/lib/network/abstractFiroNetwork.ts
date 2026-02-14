import { Psbt } from 'bitcoinjs-lib';

import {
  AbstractUtxoChainNetwork,
  TokenDetail,
} from '@rosen-chains/abstract-chain';

import { FiroTx, FiroUtxo } from '../types';

abstract class AbstractFiroNetwork extends AbstractUtxoChainNetwork<
  FiroTx,
  FiroUtxo
> {
  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: Psbt) => Promise<void>;

  /**
   * gets a utxo from the network
   * @param boxId the id of Utxo (txId + . + index)
   * @returns the utxo in FiroUtxo format
   */
  abstract getUtxo: (boxId: string) => Promise<FiroUtxo>;

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
   * Note: due to heavy size of transactions in mempool, we ignore getting mempool txs in Firo
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<FiroTx>> => {
    return [];
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   * @returns TokenDetail object
   */
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    throw new Error(
      `Firo network does not support token [${tokenId}]. Only native token is supported.`,
    );
  };

  /**
   * gets transaction with raw format
   * @param txId the transaction id
   * @returns transaction hex string
   */
  abstract getTransactionHex: (txId: string) => Promise<string>;
}

export default AbstractFiroNetwork;
