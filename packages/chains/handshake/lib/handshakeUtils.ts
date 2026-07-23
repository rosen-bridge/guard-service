import { Input, TX } from 'hsd';

/**
 * gets boxId from Handshake Input
 * @param input
 * @returns box id in `{txId}.{index}` format
 */
export const getInputBoxId = (input: Input) => {
  // Get the tx hash using prevout.txid()
  const txId = input.prevout.txid();
  return `${txId}.${input.prevout.index}`;
};

/**
 * estimates required fee for tx using hsd's native virtual size calculation
 * accounts for all transaction components including covenants
 * @param tx the transaction (MTX or TX) to estimate fee for
 * @param feeRatio fee rate in dollarydoos per vB
 */
export const estimateTxFee = (tx: TX, feeRatio: number): bigint => {
  // Handshake uses witness discount like Bitcoin, use virtual size
  const size = tx.getVirtualSize();
  return BigInt(Math.ceil(size * feeRatio));
};
