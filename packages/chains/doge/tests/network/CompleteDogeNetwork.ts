import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';
import PartialDogeNetwork from '../../lib/network/PartialDogeNetwork';
import { DogeNetworkFunction, DogeTx, DogeUtxo } from '../../lib/types';

/**
 * A complete implementation of PartialDogeNetwork that implements all functions
 * Used for testing priority
 */
export class CompleteDogeNetwork extends PartialDogeNetwork {
  readonly implements = Object.values(
    DogeNetworkFunction
  ) as DogeNetworkFunction[];

  mockHeight = 100;
  mockAssets = { nativeToken: 1000n, tokens: [] };
  mockTx: DogeTx = { id: 'tx123', inputs: [], outputs: [] };
  mockConfirmation = 10;
  mockTxHex = '1234abcd';
  mockBlockInfo: BlockInfo = {
    hash: 'block123',
    parentHash: 'block122',
    height: 123456,
  };
  mockBlockTxIds = ['tx1', 'tx2'];
  mockUtxos: DogeUtxo[] = [{ txId: 'tx1', index: 0, value: 100n }];
  mockFeeRatio = 0.5;

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  getHeight = async (): Promise<number> => {
    return this.mockHeight;
  };

  getAddressAssets = async (_address: string): Promise<AssetBalance> => {
    return this.mockAssets;
  };

  getTransaction = async (_txId: string, _blockId: string): Promise<DogeTx> => {
    return this.mockTx;
  };

  submitTransaction = async (_transaction: Psbt): Promise<void> => {
    // Do nothing in test
  };

  getTxConfirmation = async (_txId: string): Promise<number> => {
    return this.mockConfirmation;
  };

  getTransactionHex = async (_txId: string): Promise<string> => {
    return this.mockTxHex;
  };

  getBlockInfo = async (_blockId: string): Promise<BlockInfo> => {
    return this.mockBlockInfo;
  };

  getBlockTransactionIds = async (_blockId: string): Promise<Array<string>> => {
    return this.mockBlockTxIds;
  };

  getAddressBoxes = async (
    _address: string,
    _offset: number,
    _limit: number
  ): Promise<Array<DogeUtxo>> => {
    return this.mockUtxos;
  };

  isBoxUnspentAndValid = async (_boxId: string): Promise<boolean> => {
    return true;
  };

  getUtxo = async (_boxId: string): Promise<DogeUtxo> => {
    return this.mockUtxos[0];
  };

  getFeeRatio = async (): Promise<number> => {
    return this.mockFeeRatio;
  };

  isTxInMempool = async (_txId: string): Promise<boolean> => {
    return false;
  };
}
