import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AssetBalance, BlockInfo } from '@rosen-chains/abstract-chain';
import { Psbt } from 'bitcoinjs-lib';
import PartialDogeNetwork from '../../lib/network/partialDogeNetwork';
import { DogeNetworkFunction, DogeTx, DogeUtxo } from '../../lib/types';

/**
 * A complete implementation of PartialDogeNetwork that implements all functions
 * Used for testing priority
 */
export class CompleteDogeNetwork extends PartialDogeNetwork {
  readonly implements = Object.values(
    DogeNetworkFunction,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = async (_address: string): Promise<AssetBalance> => {
    return this.mockAssets;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransaction = async (_txId: string, _blockId: string): Promise<DogeTx> => {
    return this.mockTx;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitTransaction = async (_transaction: Psbt): Promise<void> => {
    // Do nothing in test
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = async (_txId: string): Promise<number> => {
    return this.mockConfirmation;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransactionHex = async (_txId: string): Promise<string> => {
    return this.mockTxHex;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockInfo = async (_blockId: string): Promise<BlockInfo> => {
    return this.mockBlockInfo;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = async (_blockId: string): Promise<Array<string>> => {
    return this.mockBlockTxIds;
  };

  getAddressBoxes = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _limit: number,
  ): Promise<Array<DogeUtxo>> => {
    return this.mockUtxos;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = async (_boxId: string): Promise<boolean> => {
    return true;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = async (_boxId: string): Promise<DogeUtxo> => {
    return this.mockUtxos[0];
  };

  getFeeRatio = async (): Promise<number> => {
    return this.mockFeeRatio;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isTxInMempool = async (_txId: string): Promise<boolean> => {
    return false;
  };
}
