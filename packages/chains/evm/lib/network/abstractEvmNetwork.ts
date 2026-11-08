import { FeeData, Transaction } from 'ethers';

import { AbstractChainNetwork } from '@rosen-chains/abstract-chain';

import { EvmTxStatus } from '../types';

abstract class AbstractEvmNetwork extends AbstractChainNetwork<Transaction> {
  /**
   * gets the amount of the input ERC20 asset in an address
   * @param address the address
   * @param tokenId the token address
   * @returns the amount of asset in bigint
   */
  abstract getAddressBalanceForERC20Asset: (
    address: string,
    tokenId: string,
  ) => Promise<bigint>;

  /**
   * gets the amount of the native token in an address
   * @param address the address
   * @returns the amount of native token in bigint
   */
  abstract getAddressBalanceForNativeToken: (
    address: string,
  ) => Promise<bigint>;

  /**
   * gets the next available nonce for the address. Note that it only checks mined transactions.
   * @param address the address
   * @returns an integer indicating next nonce
   */
  abstract getAddressNextAvailableNonce: (address: string) => Promise<number>;

  /**
   * gets gas required to execute the transaction
   * @param transaction the transaction to be run
   * @returns gas required in bigint
   */
  abstract getGasRequired: (transaction: Transaction) => Promise<bigint>;

  /**
   * gets fee-related values associated with the network
   * - the legacy gas price
   * - the maximum fee to pay per gas
   * - the additional amount to pay per gas to miner
   * it may or may not include all the values, depends on the instance implementation
   * @returns fee-related values as bigint or null
   */
  abstract getFeeData: () => Promise<FeeData>;

  /**
   * gets all transactions in mempool (returns empty list if the chain has no mempool)
   * Note: we ignore getting mempool txs in Evm, as it doesn't affect us
   * @returns empty list
   */
  getMempoolTransactions = async (): Promise<Array<Transaction>> => {
    return [];
  };

  /**
   * gets the transaction status (mempool, succeed, failed)
   * @param transactionId the transaction id (signed hash)
   * @returns the transaction status
   */
  abstract getTransactionStatus: (
    transactionId: string,
  ) => Promise<EvmTxStatus>;
}

export default AbstractEvmNetwork;
