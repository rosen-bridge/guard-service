import { Psbt } from 'bitcoinjs-lib';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';

import { DogeTx, DogeUtxo } from '../types';
import { DogeNetworkFunction } from '../types';
import AbstractDogeNetwork from './abstractDogeNetwork';

/**
 * This class provides a partial implementation of the AbstractDogeNetwork.
 * It defines all abstract methods to throw "Not implemented" errors by default.
 * Child classes will override only the methods they support, indicated by the 'implements' property.
 */
abstract class PartialDogeNetwork extends AbstractDogeNetwork {
  /**
   * List of functions implemented by this network class
   */
  abstract readonly implements: Array<DogeNetworkFunction>;

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  /**
   * Throws an error indicating the function is not implemented
   * @param functionName the name of the function that is not implemented
   */
  protected notImplemented = (functionName: string): never => {
    throw new Error(
      `Function [${functionName}] is not implemented by this partial network implementation`,
    );
  };

  // AbstractChainNetwork functions
  getHeight = async (): Promise<number> => {
    return this.notImplemented(DogeNetworkFunction.getHeight);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    return this.notImplemented(DogeNetworkFunction.getTxConfirmation);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    return this.notImplemented(DogeNetworkFunction.getAddressAssets);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    return this.notImplemented(DogeNetworkFunction.getBlockTransactionIds);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    return this.notImplemented(DogeNetworkFunction.getBlockInfo);
  };

  getTransaction = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<DogeTx> => {
    return this.notImplemented(DogeNetworkFunction.getTransaction);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitTransaction = async (transaction: Psbt): Promise<void> => {
    return this.notImplemented(DogeNetworkFunction.submitTransaction);
  };

  // AbstractUtxoChainNetwork functions
  getAddressBoxes = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number,
  ): Promise<Array<DogeUtxo>> => {
    return this.notImplemented(DogeNetworkFunction.getAddressBoxes);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    return this.notImplemented(DogeNetworkFunction.isBoxUnspentAndValid);
  };

  // AbstractDogeNetwork functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = async (boxId: string): Promise<DogeUtxo> => {
    return this.notImplemented(DogeNetworkFunction.getUtxo);
  };

  getFeeRatio = async (): Promise<number> => {
    return this.notImplemented(DogeNetworkFunction.getFeeRatio);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.notImplemented(DogeNetworkFunction.isTxInMempool);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransactionHex = async (txId: string): Promise<string> => {
    return this.notImplemented(DogeNetworkFunction.getTransactionHex);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getActualTxId = async (hash: string): Promise<string> => {
    return this.notImplemented(DogeNetworkFunction.getActualTxId);
  };
}

export default PartialDogeNetwork;
