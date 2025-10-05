import { FeeData, Transaction } from 'ethers';
import { AbstractEvmNetwork, EvmTxStatus, TransactionHashes } from '../../lib';
import {
  BlockInfo,
  AssetBalance,
  TokenDetail,
} from '@rosen-chains/abstract-chain';

class TestEvmNetwork extends AbstractEvmNetwork {
  submitTransaction = async (): Promise<void> => {
    throw Error('Not mocked');
  };

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTokenDetail = (tokenId: string): Promise<TokenDetail> => {
    throw Error('Not mocked');
  };

  getAddressBalanceForERC20Asset = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokenId: string
  ): Promise<bigint> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressBalanceForNativeToken = (address: string): Promise<bigint> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAddressNextAvailableNonce = (address: string): Promise<number> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getGasRequired = (transaction: Transaction): Promise<bigint> => {
    throw Error('Not mocked');
  };

  getFeeData = (): Promise<FeeData> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransactionStatus = (hash: string): Promise<EvmTxStatus> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransactionByNonce = (nonce: number): Promise<TransactionHashes> => {
    throw Error('Not mocked');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getActualTxId = (hash: string): Promise<string> => {
    throw Error('Not mocked');
  };
}

export default TestEvmNetwork;
