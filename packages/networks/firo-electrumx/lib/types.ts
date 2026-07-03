export type BlockchainHeaderSubscribeResult = {
  hex?: string;
  height: number;
};

export type FiroVerboseTransaction = {
  hex?: string;
  blockhash?: string;
  confirmations?: number;
};

export type FiroBalanceResponse = {
  confirmed: number;
  unconfirmed: number;
};

export type FiroUnspentOutput = {
  tx_hash: string;
  tx_pos: number;
  height: number;
  value: number;
};
