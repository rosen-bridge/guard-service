import { Block, ethers, FeeData, isCallException, Transaction } from 'ethers';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import JsonBigInt from '@rosen-bridge/json-bigint';
import { FailedError, UnexpectedApiError } from '@rosen-chains/abstract-chain';
import EvmRpcNetwork from '@rosen-chains/evm-rpc';

import { gasPriceOracleAddress, partialGasPriceOracleAbi } from './consts';

class EvmL2RpcNetwork extends EvmRpcNetwork {
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
    const baseError = `Failed to get fee data from ${this.chain} RPC: `;
    try {
      const feeData = await this.provider.getFeeData();

      if (feeData.maxPriorityFeePerGas === null)
        throw new UnexpectedApiError(
          baseError + `maxPriorityFeePerGas is null`,
        );

      const block = await this.getBlock('latest');

      if (typeof block.baseFeePerGas !== 'bigint')
        throw new UnexpectedApiError(
          baseError + `Eip1559FeesNotSupportedError`,
        );

      // max fees per gas
      const baseFeeMultiplier = 1.2;
      const multiply = (base: bigint) =>
        (base * BigInt(Math.ceil(baseFeeMultiplier * 10))) / BigInt(10);

      const baseFeePerGas = multiply(block.baseFeePerGas);
      const maxFeePerGas = baseFeePerGas + feeData.maxPriorityFeePerGas;

      this.logger.debug(
        `requested 'getFeeData' of ${
          this.chain
        } RPC. res: ${JsonBigInt.stringify(feeData)}`,
      );

      return new FeeData(
        feeData.gasPrice,
        maxFeePerGas,
        feeData.maxPriorityFeePerGas,
      );
    } catch (e: unknown) {
      throw new UnexpectedApiError(baseError + `${e}`);
    }
  };

  /**
   * gets the finalized block height
   * @returns height of the finalized block
   */
  override getFinalizedBlockHeight = async (): Promise<number> => {
    return (await this.getBlock('finalized')).number;
  };

  /**
   * gets a block using block tag
   * @returns the block
   */
  getBlock = async (tag: 'finalized' | 'latest'): Promise<Block> => {
    const baseError = `Failed to get ${tag} block from ${this.chain} RPC: `;
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
  estimateL1Gas = async (transaction: Transaction): Promise<bigint> => {
    try {
      const contract = new ethers.Contract(
        gasPriceOracleAddress,
        partialGasPriceOracleAbi,
        this.provider,
      );
      const tx = new Transaction();
      tx.chainId = transaction.chainId;
      tx.to = transaction.to;
      tx.data = transaction.data;
      tx.type = transaction.type;
      tx.gasLimit = 300_000n;
      tx.maxFeePerGas = 5000000000n;
      tx.maxPriorityFeePerGas = 1000000000n;
      tx.nonce = 1;
      const estimateOfL1Gas = await contract.getL1GasUsed(
        tx.unsignedSerialized,
      );
      this.logger.debug(
        `requested 'getL1GasUsed' method of [${gasPriceOracleAddress}] contract from ${
          this.chain
        } RPC. res: ${JsonBigInt.stringify(estimateOfL1Gas)}`,
      );
      return BigInt(estimateOfL1Gas);
    } catch (e: unknown) {
      const baseError = `Failed to get 'getL1GasUsed' of [${gasPriceOracleAddress}] from ${this.chain} RPC: `;
      throw new UnexpectedApiError(baseError + `${e}`);
    }
  };

  /**
   * estimates the l2 gas
   * @param request
   * @returns estimate of the l2 gas as bigint
   */
  estimateL2Gas = async (transaction: Transaction): Promise<bigint> => {
    try {
      const gas = await this.provider.estimateGas({
        from: this.lockAddress,
        to: transaction.to,
        data: transaction.data,
      });
      this.logger.debug(
        `requested 'estimateGas' method from ${
          this.chain
        } RPC. res: ${JsonBigInt.stringify(gas)}`,
      );
      return gas;
    } catch (e: unknown) {
      const baseError = `Failed to get 'estimateGas' from ${this.chain} RPC: `;
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

export default EvmL2RpcNetwork;
