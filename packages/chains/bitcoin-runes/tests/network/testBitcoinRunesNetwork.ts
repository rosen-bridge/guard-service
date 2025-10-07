import { BitcoinRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AssetBalance,
  BlockInfo,
  TokenDetail,
} from '@rosen-chains/abstract-chain';

import {
  AbstractBitcoinRunesNetwork,
  BitcoinRunesUtxo,
  BitcoinRunesTx,
} from '../../lib';

export class TestBitcoinRunesNetwork extends AbstractBitcoinRunesNetwork {
  extractor = new BitcoinRosenExtractor(
    'bc1qkgp89fjerymm5ltg0hygnumr0m2qa7n22gyw6h',
    new TokenMap(),
  );
  notImplemented = () => {
    throw Error('Not implemented');
  };

  currentSlot = (): Promise<number> => {
    throw Error('Not mocked');
  };

  submitTransaction = this.notImplemented;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = (address: string): Promise<AssetBalance> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTransactions = (): Promise<Array<BitcoinRunesTx>> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransaction = (txId: string, blockId: string): Promise<BitcoinRunesTx> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = (txId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = (boxId: string): Promise<BitcoinRunesUtxo> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTokenDetail = (tokenId: string): Promise<TokenDetail> => {
    throw Error('Not mocked');
  };

  getFeeRatio = (): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isTxInMempool = (txId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  getAddressRunesBoxes = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    runeId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number,
  ): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressBtcBoxes = (address: string): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error('Not mocked');
  };

  getRemainingBoxes = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchedBoxIds: Array<string>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
  ): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error('Not mocked');
  };
}
