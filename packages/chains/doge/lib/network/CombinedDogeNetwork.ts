import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Psbt } from 'bitcoinjs-lib';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';
import { DogeTx, DogeUtxo } from '../types';
import AbstractDogeNetwork from './AbstractDogeNetwork';
import PartialDogeNetwork from './PartialDogeNetwork';
import { DogeNetworkFunction } from '../types';

/**
 * This class combines multiple partial network implementations into a single network.
 * It delegates function calls to appropriate partial implementations based on their capabilities.
 * The order of partial networks in the constructor array determines their priority.
 */
class CombinedDogeNetwork extends AbstractDogeNetwork {
  private networks: Array<PartialDogeNetwork>;
  private implementations: Map<DogeNetworkFunction, PartialDogeNetwork>;

  /**
   * @param networks Array of partial network implementations
   * @param logger Logger instance
   */
  constructor(networks: Array<PartialDogeNetwork>, logger?: AbstractLogger) {
    super(logger);
    this.networks = networks;
    this.implementations = new Map();

    // Validate that all required functions have at least one implementation
    this.initializeImplementationsMap();
    this.validateCompleteness();
  }

  /**
   * Initialize the implementations map with the first network that implements each function
   */
  private initializeImplementationsMap(): void {
    // For each function, find the first network that implements it
    for (const func of Object.values(DogeNetworkFunction)) {
      for (const network of this.networks) {
        if (network.implements.includes(func as DogeNetworkFunction)) {
          this.implementations.set(func as DogeNetworkFunction, network);
          break;
        }
      }
    }
  }

  /**
   * Validate that all required functions have at least one implementation
   */
  private validateCompleteness(): void {
    const missingFunctions: DogeNetworkFunction[] = [];

    for (const func of Object.values(DogeNetworkFunction)) {
      if (!this.implementations.has(func as DogeNetworkFunction)) {
        missingFunctions.push(func as DogeNetworkFunction);
      }
    }

    if (missingFunctions.length > 0) {
      throw new Error(
        `The following functions have no implementation in any of the provided networks: ${missingFunctions.join(
          ', '
        )}`
      );
    }
  }

  /**
   * Get the appropriate network for a given function
   * @param func The function to find an implementation for
   * @returns The network implementing the function
   */
  private getNetworkForFunction(func: DogeNetworkFunction): PartialDogeNetwork {
    const network = this.implementations.get(func);
    if (!network) {
      throw new Error(`No implementation found for function [${func}]`);
    }
    return network;
  }

  // AbstractChainNetwork function implementations
  getHeight = async (): Promise<number> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getHeight
    ).getHeight();
  };

  getTxConfirmation = async (transactionId: string): Promise<number> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getTxConfirmation
    ).getTxConfirmation(transactionId);
  };

  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getAddressAssets
    ).getAddressAssets(address);
  };

  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getBlockTransactionIds
    ).getBlockTransactionIds(blockId);
  };

  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getBlockInfo
    ).getBlockInfo(blockId);
  };

  getTransaction = async (
    transactionId: string,
    blockId: string
  ): Promise<DogeTx> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getTransaction
    ).getTransaction(transactionId, blockId);
  };

  submitTransaction = async (transaction: Psbt): Promise<void> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.submitTransaction
    ).submitTransaction(transaction);
  };

  // AbstractUtxoChainNetwork function implementations
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number
  ): Promise<Array<DogeUtxo>> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getAddressBoxes
    ).getAddressBoxes(address, offset, limit);
  };

  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.isBoxUnspentAndValid
    ).isBoxUnspentAndValid(boxId);
  };

  // AbstractDogeNetwork function implementations
  getUtxo = async (boxId: string): Promise<DogeUtxo> => {
    return this.getNetworkForFunction(DogeNetworkFunction.getUtxo).getUtxo(
      boxId
    );
  };

  getFeeRatio = async (): Promise<number> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getFeeRatio
    ).getFeeRatio();
  };

  isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.isTxInMempool
    ).isTxInMempool(txId);
  };

  getTransactionHex = async (txId: string): Promise<string> => {
    return this.getNetworkForFunction(
      DogeNetworkFunction.getTransactionHex
    ).getTransactionHex(txId);
  };
}

export default CombinedDogeNetwork;
