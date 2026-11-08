import { Psbt } from 'bitcoinjs-lib';

import { DogeChain } from '../lib';

export class TestDogeChain extends DogeChain {
  callGetTransactionsBoxMapping = (
    serializedTransactions: Psbt[],
    address: string,
  ) => {
    return this.getTransactionsBoxMapping(serializedTransactions, address);
  };

  callGetTxConfirmation = (txId: string) => this.getTxConfirmation(txId);

  callResolveSignedTxId = (hash: string) => this.resolveSignedTxId(hash);
}
