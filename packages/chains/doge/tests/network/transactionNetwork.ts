import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Psbt } from 'bitcoinjs-lib';
import PartialDogeNetwork from '../../lib/network/partialDogeNetwork';
import { DogeNetworkFunction, DogeTx } from '../../lib/types';

/**
 * A test implementation of PartialDogeNetwork that only implements transaction functions
 */
export class TransactionNetwork extends PartialDogeNetwork {
  readonly implements = [
    DogeNetworkFunction.getTransaction,
    DogeNetworkFunction.submitTransaction,
    DogeNetworkFunction.getTxConfirmation,
    DogeNetworkFunction.getTransactionHex,
    DogeNetworkFunction.getActualTxId,
  ];

  mockTx: DogeTx = {
    id: 'tx123',
    inputs: [],
    outputs: [],
  };
  mockConfirmation = 10;
  mockTxHex = '1234abcd';

  constructor(logger?: AbstractLogger) {
    super(logger);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransaction = async (_txId: string, _blockId: string): Promise<DogeTx> => {
    return this.mockTx;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitTransaction = async (_transaction: Psbt): Promise<void> => {
    // Do nothing in test
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTxConfirmation = async (_txId: string): Promise<number> => {
    return this.mockConfirmation;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTransactionHex = async (_txId: string): Promise<string> => {
    return this.mockTxHex;
  };

  getActualTxId = async (hash: string): Promise<string> => {
    return hash;
  };
}
