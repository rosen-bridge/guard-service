import { MTX } from 'hsd';

import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';

import { HandshakeTx, HandshakeUtxo } from '../types';
import { HandshakeNetworkFunction } from '../types';
import AbstractHandshakeNetwork from './abstractHandshakeNetwork';

/**
 * This class provides a partial implementation of the AbstractHandshakeNetwork.
 * It defines all abstract methods to throw "Not implemented" errors by default.
 * Child classes will override only the methods they support, indicated by the 'implements' property.
 */
abstract class PartialHandshakeNetwork extends AbstractHandshakeNetwork {
  /**
   * List of functions implemented by this network class
   */
  abstract readonly implements: Array<HandshakeNetworkFunction>;

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
    return this.notImplemented(HandshakeNetworkFunction.getHeight);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    return this.notImplemented(HandshakeNetworkFunction.getTxConfirmation);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    return this.notImplemented(HandshakeNetworkFunction.getAddressAssets);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    return this.notImplemented(HandshakeNetworkFunction.getBlockTransactionIds);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockInfo = async (blockId: string): Promise<BlockInfo> => {
    return this.notImplemented(HandshakeNetworkFunction.getBlockInfo);
  };

  getTransaction = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<HandshakeTx> => {
    return this.notImplemented(HandshakeNetworkFunction.getTransaction);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitTransaction = async (transaction: MTX): Promise<void> => {
    return this.notImplemented(HandshakeNetworkFunction.submitTransaction);
  };

  // AbstractUtxoChainNetwork functions
  getAddressBoxes = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number,
  ): Promise<Array<HandshakeUtxo>> => {
    return this.notImplemented(HandshakeNetworkFunction.getAddressBoxes);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    return this.notImplemented(HandshakeNetworkFunction.isBoxUnspentAndValid);
  };

  // AbstractHandshakeNetwork functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = async (boxId: string): Promise<HandshakeUtxo> => {
    return this.notImplemented(HandshakeNetworkFunction.getUtxo);
  };

  getFeeRatio = async (): Promise<number> => {
    return this.notImplemented(HandshakeNetworkFunction.getFeeRatio);
  };

  getMempoolTxIds = async (): Promise<Array<string>> => {
    return this.notImplemented(HandshakeNetworkFunction.getMempoolTxIds);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getActualTxId = async (hash: string): Promise<string> => {
    return this.notImplemented(HandshakeNetworkFunction.getActualTxId);
  };
}

export default PartialHandshakeNetwork;
