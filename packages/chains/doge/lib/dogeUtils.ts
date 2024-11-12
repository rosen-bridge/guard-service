import { PsbtTxInput } from 'bitcoinjs-lib';

/**
 * gets boxId from PsbtTxInput
 * @param input
 * @returns box id in `{txId}.{index}` format
 */
export const getPsbtTxInputBoxId = (input: PsbtTxInput) =>
  `${input.hash.reverse().toString('hex')}.${input.index}`;
