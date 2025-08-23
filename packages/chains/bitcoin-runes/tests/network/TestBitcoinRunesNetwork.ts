import {
  AssetBalance,
  BlockInfo,
  TokenDetail,
} from '@rosen-chains/abstract-chain';
import { BitcoinRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  AbstractBitcoinRunesNetwork,
  BitcoinRunesUtxo,
  BitcoinRunesTx,
} from '../../lib';

export class TestBitcoinRunesNetwork extends AbstractBitcoinRunesNetwork {
  extractor = new BitcoinRosenExtractor(
    'bc1qkgp89fjerymm5ltg0hygnumr0m2qa7n22gyw6h',
    new TokenMap()
  );
  notImplemented = () => {
    throw Error('Not implemented');
  };

  currentSlot = (): Promise<number> => {
    throw Error('Not mocked');
  };

  submitTransaction = this.notImplemented;

  getAddressAssets = (address: string): Promise<AssetBalance> => {
    throw Error('Not mocked');
  };

  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTransactions = (): Promise<Array<BitcoinRunesTx>> => {
    throw Error('Not mocked');
  };

  getTransaction = (txId: string, blockId: string): Promise<BitcoinRunesTx> => {
    throw Error('Not mocked');
  };

  getTxConfirmation = (txId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  getUtxo = (boxId: string): Promise<BitcoinRunesUtxo> => {
    throw Error('Not mocked');
  };

  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    throw Error('Not mocked');
  };

  getTokenDetail = (tokenId: string): Promise<TokenDetail> => {
    throw Error('Not mocked');
  };

  getFeeRatio = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTxIds = (): Promise<Array<string>> => {
    throw Error('Not mocked');
  };

  getAddressRunesBoxes = (
    address: string,
    runeId: string,
    offset: number,
    limit: number
  ): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error('Not mocked');
  };

  getAddressBtcBoxes = (address: string): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error('Not mocked');
  };

  getRemainingBoxes = (
    fetchedBoxIds: Array<string>,
    address: string
  ): Promise<Array<BitcoinRunesUtxo>> => {
    throw Error('Not mocked');
  };
}
