import { AssetBalance } from '@rosen-chains/abstract-chain';

import { AbstractFiroNetwork, FiroUtxo } from '../../lib';

export default class TestFiroNetwork extends AbstractFiroNetwork {
  notImplemented = () => {
    throw Error('Not implemented');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = (address: string): Promise<AssetBalance> => {
    throw Error('Not mocked');
  };

  getFeeRatio = (): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = (boxId: string): Promise<FiroUtxo> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransactionHex = (txId: string): Promise<string> => {
    throw Error('Not mocked');
  };

  getTxConfirmation = this.notImplemented;
  getBlockTransactionIds = this.notImplemented;
  getBlockInfo = this.notImplemented;
  getTransaction = this.notImplemented;
  submitTransaction = this.notImplemented;
  getActualTxId = this.notImplemented;
  getAddressBoxes = this.notImplemented;
  isTxInMempool = this.notImplemented;
}
