import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { BlockInfo } from '@rosen-chains/abstract-chain';
import PartialDogeNetwork from '../../lib/network/PartialDogeNetwork';
import { DogeNetworkFunction, DogeUtxo } from '../../lib/types';

/**
 * A test implementation of PartialDogeNetwork that only implements block and utxo functions
 */
export class BlockAndUtxoNetwork extends PartialDogeNetwork {
  readonly implements = [
    DogeNetworkFunction.getBlockInfo,
    DogeNetworkFunction.getBlockTransactionIds,
    DogeNetworkFunction.getAddressBoxes,
    DogeNetworkFunction.isBoxUnspentAndValid,
    DogeNetworkFunction.getUtxo,
    DogeNetworkFunction.getFeeRatio,
    DogeNetworkFunction.isTxInMempool,
  ];

  mockBlockInfo: BlockInfo = {
    hash: 'block123',
    parentHash: 'block122',
    height: 123456,
  };
  mockBlockTxIds = ['tx1', 'tx2'];
  mockUtxos: DogeUtxo[] = [
    {
      txId: 'tx1',
      index: 0,
      value: 100n,
    },
  ];
  mockFeeRatio = 0.5;

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

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
