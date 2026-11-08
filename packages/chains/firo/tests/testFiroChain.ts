import { Psbt } from 'bitcoinjs-lib';

import { FiroChain } from '../lib';

export class TestFiroChain extends FiroChain {
  callGetTransactionsBoxMapping = (
    serializedTransactions: Psbt[],
    address: string,
  ) => {
    return this.getTransactionsBoxMapping(serializedTransactions, address);
  };

  callGetTxConfirmation = (txId: string) => this.getTxConfirmation(txId);

  callResolveSignedTxId = (hash: string) => this.resolveSignedTxId(hash);
}
