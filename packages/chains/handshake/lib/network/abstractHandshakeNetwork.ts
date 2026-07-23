import { MTX } from 'hsd';

import {
  AbstractUtxoChainNetwork,
  TokenDetail,
} from '@rosen-chains/abstract-chain';

import { HandshakeTx, HandshakeUtxo } from '../types';

abstract class AbstractHandshakeNetwork extends AbstractUtxoChainNetwork<
  HandshakeTx,
  HandshakeUtxo
> {
  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: MTX) => Promise<void>;

  /**
   * gets a utxo from the network
   * @param boxId the id of Utxo (txId + . + index)
   * @returns the utxo in HandshakeUtxo format
   */
  abstract getUtxo: (boxId: string) => Promise<HandshakeUtxo>;

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
   * Note: we ignore getting mempool txs in Handshake, as it doesn't affect us
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<HandshakeTx>> => {
    return [];
  };

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTokenDetail = async (tokenId: string): Promise<TokenDetail> => {
    throw Error(`Handshake does not support token`);
  };

  /**
   * gets the actual id of a transaction by its hash
   * @param hash
   */
  getActualTxId = async (hash: string): Promise<string> => hash;
}

export default AbstractHandshakeNetwork;
