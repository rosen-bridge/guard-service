import { AbstractUtxoChainNetwork } from '../../lib';
import TestRosenDataExtractor from '../extractor/TestRosenDataExtractor';

class TestUtxoChainNetwork extends AbstractUtxoChainNetwork<string, string> {
  extractor = new TestRosenDataExtractor();

  notImplemented = () => {
    throw Error('Not implemented');
  };

  getHeight = this.notImplemented;
  getAddressAssets = this.notImplemented;
  getTransaction = this.notImplemented;
  getBlockTransactionIds = this.notImplemented;
  getBlockInfo = this.notImplemented;
  submitTransaction = this.notImplemented;
  getMempoolTransactions = this.notImplemented;

  isBoxUnspentAndValid = this.notImplemented;
  getTokenDetail = this.notImplemented;

  getTxConfirmation = (transactionId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  getAddressBoxes = (
    address: string,
    offset: number,
    limit: number
  ): Promise<string[]> => {
    throw Error('Not mocked');
  };

  getActualTxId = (hash: string): Promise<string> => {
    throw Error('Not mocked');
  };
}

export default TestUtxoChainNetwork;
