import { AbstractChainNetwork, AssetBalance, BlockInfo } from '../../lib';
import TestRosenDataExtractor from '../extractor/TestRosenDataExtractor';

class TestUtxoChainNetwork extends AbstractChainNetwork<string> {
  extractor = new TestRosenDataExtractor();

  notImplemented = () => {
    throw Error('Not implemented');
  };

  getHeight = this.notImplemented;
  submitTransaction = this.notImplemented;
  getMempoolTransactions = this.notImplemented;
  getTokenDetail = this.notImplemented;

  getAddressAssets = (address: string): Promise<AssetBalance> => {
    throw Error('Not mocked');
  };
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };
  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    throw Error('Not mocked');
  };

  getTransaction = (
    transactionId: string,
    blockId: string
  ): Promise<string> => {
    throw Error('Not mocked');
  };

  getTxConfirmation = (transactionId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  getActualTxId = (hash: string): Promise<string> => {
    throw Error('Not mocked');
  };
}

export default TestUtxoChainNetwork;
