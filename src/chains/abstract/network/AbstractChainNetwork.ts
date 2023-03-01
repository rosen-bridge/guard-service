import { AssetBalance } from '../Interfaces';

abstract class AbstractChainNetwork {
  /**
   * gets the blockchain height
   * @returns the blockchain height
   */
  abstract getHeight: () => number;

  /**
   * gets confirmation for a transaction
   * @param transactionId the transaction id
   * @returns the transaction confirmation
   */
  abstract getTxConfirmation: (transactionId: string) => number;

  /**
   * gets the amount of each asset in an address
   * @param address the address
   * @returns an object containing the amount of each asset
   */
  abstract getAddressAssets: (address: string) => AssetBalance;

  /**
   * gets a transaction
   * @param transactionId the transaction id
   * @returns the serialized string of the transaction
   */
  abstract getTransaction: (transactionId: string) => string;

  /**
   * submits a transaction
   * @param transaction the transaction
   */
  abstract submitTransaction: (transaction: string) => void;

  /**
   * checks if a transaction is in mempool (returns false if the chain has no mempool)
   * @param transactionId the transaction id
   * @returns true if the transaction is in mempool
   */
  abstract isTxInMempool: (transactionId: string) => boolean;
}

export default AbstractChainNetwork;
