import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { AssetBalance, BlockInfo, TokenDetail } from '../types';

abstract class AbstractChainNetwork<TxType> {
  logger: AbstractLogger;

  constructor(logger?: AbstractLogger) {
    this.logger = logger ? logger : new DummyLogger();
  }

  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  abstract getHeight: () => Promise<number>;

  /**
   * gets confirmation for a transaction or -1 if tx is not in the blockchain
   * @param transactionId the transaction id
   * @returns the transaction confirmation or -1 if tx is not in the blockchain
   */
  abstract getTxConfirmation: (transactionId: string) => Promise<number>;

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  abstract getAddressAssets: (address: string) => Promise<AssetBalance>;

  /**
   * gets id of all transactions in the given block
   * @param blockId the block id
   * @returns list of the transaction ids in the block
   */
  abstract getBlockTransactionIds: (blockId: string) => Promise<Array<string>>;

  /**
   * gets info of the given block
   * @param blockId the block id
   * @returns an object containing block info
   */
  abstract getBlockInfo: (blockId: string) => Promise<BlockInfo>;

  /**
   * gets a transaction
   * @param transactionId the transaction id
   * @param blockId the block id
   * @returns the transaction
   */
  abstract getTransaction: (
    transactionId: string,
    blockId: string,
  ) => Promise<TxType>;

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: any) => Promise<void>;

  /**
   * gets all transactions in mempool (returns empty list if the chain has no mempool)
   * @returns list of transactions in mempool
   */
  abstract getMempoolTransactions: () => Promise<Array<TxType>>;

  /**
   * gets token details (name, decimals)
   * @param tokenId
   */
  abstract getTokenDetail: (tokenId: string) => Promise<TokenDetail>;

  /**
   * gets the actual id of a transaction by its hash
   * @param hash
   */
  abstract getActualTxId: (hash: string) => Promise<string>;
}

export default AbstractChainNetwork;
