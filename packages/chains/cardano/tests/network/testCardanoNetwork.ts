import { AbstractCardanoNetwork } from '../../lib';
import { BlockInfo, TokenDetail } from '@rosen-chains/abstract-chain';
import {
  CardanoProtocolParameters,
  CardanoTx,
  CardanoUtxo,
} from '../../lib/types';
import { CardanoRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { protocolParameters } from '../testUtils';
import { TokenMap } from '@rosen-bridge/tokens';

class TestCardanoNetwork extends AbstractCardanoNetwork {
  extractor = new CardanoRosenExtractor(
    '9es3xKFSehNNwCpuNpY31ScAubDqeLbSWwaCysjN1ee51bgHKTq',
    new TokenMap(),
  );
  notImplemented = () => {
    throw Error('Not implemented');
  };

  currentSlot = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getAddressAssets = this.notImplemented;
  submitTransaction = this.notImplemented;

  getAddressBoxes = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number,
  ): Promise<Array<CardanoUtxo>> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTransactions = (): Promise<Array<CardanoTx>> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransaction = (txId: string, blockId: string): Promise<CardanoTx> => {
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
  getUtxo = (boxId: string): Promise<CardanoUtxo> => {
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

  getProtocolParameters = (): Promise<CardanoProtocolParameters> =>
    Promise.resolve(protocolParameters);
}

export default TestCardanoNetwork;
