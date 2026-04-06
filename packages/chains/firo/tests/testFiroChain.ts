import { Psbt } from 'bitcoinjs-lib';

import { FiroChain } from '../lib';

export class TestFiroChain extends FiroChain {
  callGetTransactionsBoxMapping = (
    serializedTransactions: Psbt[],
    address: string,
  ) => {
    return this.getTransactionsBoxMapping(serializedTransactions, address);
  };
}
