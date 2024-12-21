import { AbstractDogeNetwork, DogeTx, DogeUtxo } from '../../lib';
import { BlockInfo, TokenDetail } from '@rosen-chains/abstract-chain';
import { DogeRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';

class TestDogeNetwork extends AbstractDogeNetwork {
  extractor = new DogeRosenExtractor(
    'DHTom1rFwsgAn5raKU1nok8E5MdQ4GBkAN',
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
  ): Promise<Array<DogeUtxo>> => {
    throw Error('Not mocked');
  };

  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTransactions = (): Promise<Array<DogeTx>> => {
    throw Error('Not mocked');
  };

  getTransaction = (txId: string, blockId: string): Promise<DogeTx> => {
    throw Error('Not mocked');
  };

  getTxConfirmation = (txId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  getUtxo = (boxId: string): Promise<DogeUtxo> => {
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

  getTransactionHex = (txId: string): Promise<string> => {
    throw Error('Not mocked');
  };

  getSpentTransactionByInputId = (
    boxId: string
  ): Promise<DogeTx | undefined> => {
    throw Error('Not mocked');
  };
}

export default TestDogeNetwork;
