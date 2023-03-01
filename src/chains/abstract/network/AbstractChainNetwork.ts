import { AssetBalance } from '../Interfaces';

abstract class AbstractChainNetwork {
  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  abstract getHeight: () => Promise<number>;

  /**
   * gets confirmation for a transaction
   * @param transactionId the transaction id
   * @returns the transaction confirmation
   */
  abstract getTxConfirmation: (transactionId: string) => Promise<number>;

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  abstract getAddressAssets: (address: string) => Promise<AssetBalance>;

  /**
   * gets a transaction
   * @param transactionId the transaction id
   * @returns the serialized string of the transaction
   */
  abstract getTransaction: (transactionId: string) => Promise<string>;

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: string) => Promise<void>;

  /**
   * gets all transactions in mempool (returns empty list if the chain has no mempool)
   * @returns list of serialized string of the transactions in mempool
   */
  abstract getMempoolTransactions: () => Promise<string[]>;
}

export default AbstractChainNetwork;
