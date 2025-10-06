import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { BlockInfo } from '@rosen-chains/abstract-chain';
import PartialDogeNetwork from '../../lib/network/partialDogeNetwork';
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
