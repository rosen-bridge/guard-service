import { MTX } from 'hsd';

import { HandshakeChain } from '../lib';

export class TestHandshakeChain extends HandshakeChain {
  callGetTransactionsBoxMapping = (transactions: MTX[], address: string) => {
    return this.getTransactionsBoxMapping(transactions, address);
  };
}
