import { vi } from 'vitest';

import {
  AssetBalance,
  BlockInfo,
  TokenDetail,
} from '@rosen-chains/abstract-chain';

import { AbstractFiroNetwork, FiroTx, FiroUtxo } from '../../lib';

const createMockLogger = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: any = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    critical: vi.fn(),
    child: vi.fn().mockImplementation(() => mock),
  };
  return mock;
};

export default class TestFiroNetwork extends AbstractFiroNetwork {
  logger = createMockLogger();

  notImplemented = () => {
    throw Error('Not mocked');
  };

  getHeight = this.notImplemented as () => Promise<number>;
  getTxConfirmation = this.notImplemented as (txId: string) => Promise<number>;
  getAddressAssets = this.notImplemented as (
    address: string,
  ) => Promise<AssetBalance>;
  getBlockTransactionIds = this.notImplemented as (
    blockId: string,
  ) => Promise<Array<string>>;
  getBlockInfo = this.notImplemented as (blockId: string) => Promise<BlockInfo>;
  getTransaction = this.notImplemented as (
    transactionId: string,
    blockId: string,
  ) => Promise<FiroTx>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitTransaction = this.notImplemented as (tx: any) => Promise<void>;
  getMempoolTransactions = this.notImplemented as () => Promise<Array<FiroTx>>;
  getTokenDetail = this.notImplemented as (
    tokenId: string,
  ) => Promise<TokenDetail>;
  getActualTxId = this.notImplemented as (hash: string) => Promise<string>;
  getAddressBoxes = this.notImplemented as (
    address: string,
    offset: number,
    limit: number,
  ) => Promise<Array<FiroUtxo>>;
  isBoxUnspentAndValid = this.notImplemented as (
    boxId: string,
  ) => Promise<boolean>;
  getUtxo = this.notImplemented as (boxId: string) => Promise<FiroUtxo>;
  getFeeRatio = this.notImplemented as () => Promise<number>;
  isTxInMempool = this.notImplemented as (txId: string) => Promise<boolean>;
  getTransactionHex = this.notImplemented as (txId: string) => Promise<string>;
}
