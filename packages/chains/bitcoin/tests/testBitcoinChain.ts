import { Psbt } from 'bitcoinjs-lib';
import { BitcoinChain } from '../lib';

export class TestBitcoinChain extends BitcoinChain {
  callGetTransactionsBoxMapping = (
    serializedTransactions: Psbt[],
    address: string
  ) => {
    return this.getTransactionsBoxMapping(serializedTransactions, address);
  };
}
