import { AbstractChainNetwork, AssetBalance, BlockInfo } from '../../lib';
import TestRosenDataExtractor from '../extractor/testRosenDataExtractor';

class TestUtxoChainNetwork extends AbstractChainNetwork<string> {
  extractor = new TestRosenDataExtractor();

  notImplemented = () => {
    throw Error('Not implemented');
  };

  getHeight = this.notImplemented;
  submitTransaction = this.notImplemented;
  getMempoolTransactions = this.notImplemented;
  getTokenDetail = this.notImplemented;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = (address: string): Promise<AssetBalance> => {
    throw Error('Not mocked');
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = (blockId: string): Promise<Array<string>> => {
    throw Error('Not mocked');
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockInfo = (blockId: string): Promise<BlockInfo> => {
    throw Error('Not mocked');
  };

  getTransaction = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string
  ): Promise<string> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = (transactionId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getActualTxId = (hash: string): Promise<string> => {
    throw Error('Not mocked');
  };
}

export default TestUtxoChainNetwork;
