import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Psbt } from 'bitcoinjs-lib';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';
import { DogeTx, DogeUtxo } from '../types';
import AbstractDogeNetwork from './AbstractDogeNetwork';
import { DogeNetworkFunction } from '../types';

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
      `Function [${functionName}] is not implemented by this partial network implementation`
    );
  };

  // AbstractChainNetwork functions
  getHeight = async (): Promise<number> => {
    return this.notImplemented(DogeNetworkFunction.getHeight);
  };

  getTxConfirmation = async (transactionId: string): Promise<number> => {
    return this.notImplemented(DogeNetworkFunction.getTxConfirmation);
  };

  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    return this.notImplemented(DogeNetworkFunction.getAddressAssets);
  };

  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    return this.notImplemented(DogeNetworkFunction.getBlockTransactionIds);
  };

  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    return this.notImplemented(DogeNetworkFunction.getBlockInfo);
  };

  getTransaction = async (
    transactionId: string,
    blockId: string
  ): Promise<DogeTx> => {
    return this.notImplemented(DogeNetworkFunction.getTransaction);
  };

  submitTransaction = async (transaction: Psbt): Promise<void> => {
    return this.notImplemented(DogeNetworkFunction.submitTransaction);
  };

  // AbstractUtxoChainNetwork functions
  getAddressBoxes = async (
    address: string,
    offset: number,
    limit: number
  ): Promise<Array<DogeUtxo>> => {
    return this.notImplemented(DogeNetworkFunction.getAddressBoxes);
  };

  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    return this.notImplemented(DogeNetworkFunction.isBoxUnspentAndValid);
  };

  // AbstractDogeNetwork functions
  getUtxo = async (boxId: string): Promise<DogeUtxo> => {
    return this.notImplemented(DogeNetworkFunction.getUtxo);
  };

  getFeeRatio = async (): Promise<number> => {
    return this.notImplemented(DogeNetworkFunction.getFeeRatio);
  };

  isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.notImplemented(DogeNetworkFunction.isTxInMempool);
  };

  getTransactionHex = async (txId: string): Promise<string> => {
    return this.notImplemented(DogeNetworkFunction.getTransactionHex);
  };

  getActualTxId = async (hash: string): Promise<string> => {
    return this.notImplemented(DogeNetworkFunction.getActualTxId);
  };
}

export default PartialDogeNetwork;
