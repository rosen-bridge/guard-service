import { MTX } from 'hsd';

import { AssetBalance } from '@rosen-chains/abstract-chain';

import {
  AbstractHandshakeNetwork,
  HandshakeTx,
  HandshakeUtxo,
} from '../../lib';

class TestHandshakeNetwork extends AbstractHandshakeNetwork {
  getHeight = async (): Promise<number> => {
    throw Error(`TestError: Not mocked`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = async (transactionId: string): Promise<number> => {
    throw Error(`TestError: Not mocked`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressAssets = async (address: string): Promise<AssetBalance> => {
    throw Error(`TestError: Not mocked`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBlockTransactionIds = async (blockId: string): Promise<Array<string>> => {
    throw Error(`TestError: Not mocked`);
  };

  getBlockInfo = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<{ hash: string; parentHash: string; height: number }> => {
    throw Error(`TestError: Not mocked`);
  };

  getTransaction = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    blockId: string,
  ): Promise<HandshakeTx> => {
    throw Error(`TestError: Not mocked`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitTransaction = async (transaction: MTX): Promise<void> => {
    throw Error(`TestError: Not mocked`);
  };

  getAddressBoxes = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number,
  ): Promise<Array<HandshakeUtxo>> => {
    throw Error(`TestError: Not mocked`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = async (boxId: string): Promise<boolean> => {
    throw Error(`TestError: Not mocked`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUtxo = async (boxId: string): Promise<HandshakeUtxo> => {
    throw Error(`TestError: Not mocked`);
  };

  getFeeRatio = async (): Promise<number> => {
    throw Error(`TestError: Not mocked`);
  };

  getMempoolTxIds = async (): Promise<Array<string>> => {
    throw Error(`TestError: Not mocked`);
  };
}

export default TestHandshakeNetwork;
