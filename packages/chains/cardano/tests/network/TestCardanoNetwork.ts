import { AbstractCardanoNetwork } from '../../lib';
import {
  BlockInfo,
  ConfirmationStatus,
  TokenDetail,
} from '@rosen-chains/abstract-chain';
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
    new TokenMap()
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
    address: string,
    offset: number,
    limit: number
  ): Promise<Array<CardanoUtxo>> => {
    throw Error('Not mocked');
  };

  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTransactions = (): Promise<Array<CardanoTx>> => {
    throw Error('Not mocked');
  };

  getTransaction = (txId: string, blockId: string): Promise<CardanoTx> => {
    throw Error('Not mocked');
  };

  getTxConfirmation = (txId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  getUtxo = (boxId: string): Promise<CardanoUtxo> => {
    throw Error('Not mocked');
  };

  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    throw Error('Not mocked');
  };

  getTokenDetail = (tokenId: string): Promise<TokenDetail> => {
    throw Error('Not mocked');
  };

  getProtocolParameters = (): Promise<CardanoProtocolParameters> =>
    Promise.resolve(protocolParameters);
}

export default TestCardanoNetwork;
