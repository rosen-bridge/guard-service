import {
  Block,
  ethers,
  FeeData,
  isCallException,
  Transaction,
  TransactionResponse,
} from 'ethers';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { FailedError, UnexpectedApiError } from '@rosen-chains/abstract-chain';
import { EvmTxStatus } from '@rosen-chains/evm';
import EvmRpcNetwork from '@rosen-chains/evm-rpc';

import { gasPriceOracleAddress, partialGasPriceOracleAbi } from './consts';

class EvmOpStackRpcNetwork extends EvmRpcNetwork {
  constructor(
    chain: string,
    url: string,
    dataSource: DataSource,
    lockAddress: string,
    authToken?: string,
    logger?: AbstractLogger,
  ) {
    super(chain, url, dataSource, lockAddress, authToken, logger);
  }

  /**
   * gets gas required to execute the transaction
   * @param transaction the transaction to be run
   * @returns gas required in bigint
   */
  override getGasRequired = async (
    transaction: Transaction,
  ): Promise<bigint> => {
    const [l1Gas, l2Gas] = await Promise.all([
      this.estimateL1Gas(transaction),
      this.estimateL2Gas(transaction),
    ]);

    return l1Gas + l2Gas;
  };

  /**
   * gets fee-related values associated with the network
   * - the legacy gas price
   * - the maximum fee to pay per gas
   * - the additional amount to pay per gas to miner
   * it includes all the values
   * @returns fee-related values as bigint or null
   */
  override getFeeData = async (): Promise<FeeData> => {
    const baseError = `Failed to get fee data of ${this.chain} RPC: `;
    let feeData: FeeData;
    try {
      feeData = await this.provider.getFeeData();
      this.logger.debug(
        `requested 'getFeeData' of ${
          this.chain
        } RPC. res: ${JsonBigInt.stringify(feeData)}`,
      );
    } catch (e: unknown) {
      throw new UnexpectedApiError(baseError + `${e}`);
    }

    if (feeData.maxPriorityFeePerGas === null)
      throw new UnexpectedApiError(baseError + `maxPriorityFeePerGas is null`);

    const block = await this.getBlock('latest');

    if (typeof block.baseFeePerGas !== 'bigint')
      throw new UnexpectedApiError(
        baseError +
          `expected bigint "block.baseFeePerGas", got ${typeof block.baseFeePerGas}`,
      );

    // max fees per gas
    const baseFeeMultiplier = 1.2;
    const multiply = (base: bigint) =>
      (base * BigInt(Math.ceil(baseFeeMultiplier * 10))) / BigInt(10);

    const baseFeePerGas = multiply(block.baseFeePerGas);
    const maxFeePerGas = baseFeePerGas + feeData.maxPriorityFeePerGas;

    return new FeeData(
      feeData.gasPrice,
      maxFeePerGas,
      feeData.maxPriorityFeePerGas,
    );
  };

  /**
   * gets confirmation for a transaction (returns -1 if tx is not mined or found)
   * Note: this function considers the hash as unsigned hash
   *  if the tx was not found, considers it as TxId (signed hash)
   * @param hash the unsigned hash or ID of the transaction
   * @returns the transaction confirmation
   */
  override getTxConfirmation = async (hash: string): Promise<number> => {
    // check if hash is representing signed or unsigned version of the tx
    const txRecord = await this.dbAction.getTxByUnsignedHash(hash);
    const transactionId = txRecord === null ? hash : txRecord.signedHash;

    // get transaction confirmation
    const baseError = `Failed to get transaction [${transactionId}] from ${this.chain} RPC: `;
    let tx: TransactionResponse | null;
    try {
      tx = await this.provider.getTransaction(transactionId);
      this.logger.debug(
        `requested 'getTransaction' of ${
          this.chain
        } RPC with id [${transactionId}]. res: ${JsonBigInt.stringify(tx)}`,
      );
    } catch (e: unknown) {
      throw new UnexpectedApiError(baseError + `${e}`);
    }
    if (!tx) {
      this.logger.debug(`Transaction [${transactionId}] is not found`);
      return -1;
    }
    try {
      const status = await this.getStatus(tx);
      if (status === EvmTxStatus.succeed) {
        const finalizedBlockHeight = (await this.getBlock('finalized')).number;
        return Math.max(finalizedBlockHeight - tx.blockNumber!, 0);
      } else return -1;
    } catch (e) {
      throw new UnexpectedApiError(baseError + `${e}`);
    }
  };

  /**
   * gets a block using block tag
   * @returns the block
   */
  protected getBlock = async (tag: 'finalized' | 'latest'): Promise<Block> => {
    const baseError = `Failed to get ${tag} block of ${this.chain} RPC: `;
    let block: Block | null;
    try {
      block = await this.provider.getBlock(tag);
      this.logger.debug(
        `requested 'getBlock' of ${
          this.chain
        } RPC for blockTag [${tag}]. res: ${JsonBigInt.stringify(block)}`,
      );
    } catch (e: unknown) {
      throw new UnexpectedApiError(baseError + `${e}`);
    }
    if (block) return block;
    throw new FailedError(baseError + 'Block not found');
  };

  /**
   * estimates the l1 gas
   * @param transaction
   * @returns estimate of the l1 gas as bigint
   */
  protected estimateL1Gas = async (
    transaction: Transaction,
  ): Promise<bigint> => {
    try {
      const contract = new ethers.Contract(
        gasPriceOracleAddress,
        partialGasPriceOracleAbi,
        this.provider,
      );
      const tx = Transaction.from({
        chainId: transaction.chainId,
        to: transaction.to,
        data: transaction.data,
        type: transaction.type,
        gasLimit: 300_000n,
        maxFeePerGas: 5_000_000_000n,
        maxPriorityFeePerGas: 1_000_000_000n,
        nonce: 1,
      });
      const estimateOfL1Gas = await contract.getL1GasUsed(
        tx.unsignedSerialized,
      );
      this.logger.debug(
        `requested 'getL1GasUsed' method of Gas Price Oracle contract of ${
          this.chain
        } RPC. res: ${JsonBigInt.stringify(estimateOfL1Gas)}`,
      );
      return BigInt(estimateOfL1Gas);
    } catch (e: unknown) {
      const baseError = `Failed to get 'getL1GasUsed' of Gas Price Oracle contract of ${this.chain} RPC: `;
      throw new UnexpectedApiError(baseError + `${e}`);
    }
  };

  /**
   * estimates the l2 gas
   * @param transaction
   * @returns estimate of the l2 gas as bigint
   */
  protected estimateL2Gas = async (
    transaction: Transaction,
  ): Promise<bigint> => {
    try {
      const gas = await this.provider.estimateGas({
        from: this.lockAddress,
        to: transaction.to,
        data: transaction.data,
      });
      this.logger.debug(
        `requested 'estimateGas' of ${
          this.chain
        } RPC. res: ${JsonBigInt.stringify(gas)}`,
      );
      return gas;
    } catch (e: unknown) {
      const baseError = `Failed to get 'estimateGas' of ${this.chain} RPC: `;
      if (isCallException(e)) {
        this.logger.debug(
          `Gas estimation failed on chain [${
            this.chain
          }] due to CALL_EXCEPTION: ${JsonBigInt.stringify(e)}`,
        );
        throw new UnexpectedApiError(
          baseError + `CALL_EXCEPTION: ${JsonBigInt.stringify(e.info)}`,
        );
      } else throw new UnexpectedApiError(baseError + `${e}`);
    }
  };
}

export default EvmOpStackRpcNetwork;
