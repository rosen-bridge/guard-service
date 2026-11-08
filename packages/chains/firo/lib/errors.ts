/**
 * thrown when the saved transaction of a hash is not signed
 * (its PSBT cannot be extracted, so the signed transaction id is unknown)
 */
export class TxNotSignedError extends Error {
  constructor(msg: string) {
    super('TxNotSignedError: ' + msg);
  }
}
