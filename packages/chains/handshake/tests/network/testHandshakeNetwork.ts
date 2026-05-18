import { AbstractHandshakeNetwork, HandshakeUtxo } from '../../lib';

class TestHandshakeNetwork extends AbstractHandshakeNetwork {
  notImplemented = () => {
    throw Error('Not implemented');
  };

  getHeight = this.notImplemented;
  getTxConfirmation = this.notImplemented;
  getAddressAssets = this.notImplemented;
  getBlockTransactionIds = this.notImplemented;
  getBlockInfo = this.notImplemented;
  getTransaction = this.notImplemented;
  submitTransaction = this.notImplemented;
  getAddressBoxes = this.notImplemented;
  getMempoolTxIds = this.notImplemented;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = (boxId: string): Promise<HandshakeUtxo> => {
    throw Error('Not mocked');
  };

  getFeeRatio = (): Promise<number> => {
    throw Error('Not mocked');
  };
}

export default TestHandshakeNetwork;
