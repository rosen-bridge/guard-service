import { AbstractErgoNetwork } from '../../lib';
import { ErgoRosenExtractor } from '@rosen-bridge/rosen-extractor';
import { ErgoBox, ErgoStateContext, Transaction } from 'ergo-lib-wasm-nodejs';
import { testLockAddress } from '../ergoTestUtils';
import {
  AssetBalance,
  BlockInfo,
  TokenDetail,
} from '@rosen-chains/abstract-chain';
import { TokenMap } from '@rosen-bridge/tokens';

class TestErgoNetwork extends AbstractErgoNetwork {
  extractor = new ErgoRosenExtractor(testLockAddress, new TokenMap());

  notImplemented = () => {
    throw Error('Not implemented');
  };
  submitTransaction = this.notImplemented;

  getAddressAssets = (): Promise<AssetBalance> => {
    throw Error('Not mocked');
  };

  getHeight = (): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransaction = (txId: string, blockId: string): Promise<Transaction> => {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isBoxUnspentAndValid = (boxId: string): Promise<boolean> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = (txId: string): Promise<number> => {
    throw Error('Not mocked');
  };

  getMempoolTransactions = (): Promise<Array<Transaction>> => {
    throw Error('Not mocked');
  };

  getAddressBoxes = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit: number
  ): Promise<Array<ErgoBox>> => {
    throw Error('Not mocked');
  };

  getStateContext = (): Promise<ErgoStateContext> => {
    throw Error('Not mocked');
  };

  getBoxesByTokenId = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokenId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offset?: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    limit?: number
  ): Promise<Array<ErgoBox>> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBox = (boxId: string): Promise<ErgoBox> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTokenDetail = (tokenId: string): Promise<TokenDetail> => {
    throw Error('Not mocked');
  };
}

export default TestErgoNetwork;
