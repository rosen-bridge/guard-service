import { binToHex, hexToBin } from '@bitauth/libauth';

import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import {
  assertBchHex,
  bchP2pkhScriptFromPublicKey,
  buildBchSignedTransaction,
  getBchActualTxId,
  getBchApprovalTxId,
  validateBchNativeTransaction,
  verifyBchSignedTransaction,
} from './bitcoinCashUtils';
import {
  BCH_MAX_ENVELOPE_CHARACTERS,
  BCH_MAX_INPUTS,
  BCH_MAX_METADATA_CHARACTERS,
  BCH_MAX_PARENT_TRANSACTION_BYTES,
  BCH_MAX_TRANSACTION_BYTES,
  BITCOIN_CASH_CHAIN,
} from './constants';
import { BitcoinCashPrevout, BitcoinCashPrevoutJson } from './types';

const text = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > BCH_MAX_METADATA_CHARACTERS)
    throw Error('Invalid transaction metadata');
  return value;
};

const keys = (value: unknown, expected: string[]): Record<string, unknown> => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== expected.sort().join(',')
  )
    throw Error('Invalid envelope schema');
  return value as Record<string, unknown>;
};

class BitcoinCashTransaction extends PaymentTransaction {
  readonly prevouts: readonly BitcoinCashPrevout[];
  readonly publicKey: string;

  constructor(
    eventId: string,
    txBytes: Uint8Array,
    txType: TransactionType,
    prevouts: readonly BitcoinCashPrevout[],
    publicKey: string,
  ) {
    const script = bchP2pkhScriptFromPublicKey(publicKey);
    const tx = validateBchNativeTransaction(txBytes, prevouts, script);
    if (!Object.values(TransactionType).includes(txType))
      throw Error('Invalid transaction type');
    const unsigned = tx.inputs.every(
      (input) => input.unlockingBytecode.length === 0,
    );
    if (!unsigned && !verifyBchSignedTransaction(txBytes, prevouts, publicKey))
      throw Error('Invalid or partially signed transaction');
    super(
      BITCOIN_CASH_CHAIN,
      getBchApprovalTxId(txBytes),
      text(eventId),
      Uint8Array.from(txBytes),
      txType,
    );
    this.prevouts = prevouts.map((prevout) => Object.freeze({ ...prevout }));
    this.publicKey = publicKey;
  }

  validate = (): void => {
    if (
      this.network !== BITCOIN_CASH_CHAIN ||
      this.txId !== getBchApprovalTxId(this.txBytes) ||
      !Object.values(TransactionType).includes(this.txType)
    )
      throw Error('Inconsistent transaction envelope');
    text(this.eventId);
    const tx = validateBchNativeTransaction(
      this.txBytes,
      this.prevouts,
      bchP2pkhScriptFromPublicKey(this.publicKey),
    );
    if (
      tx.inputs.some((input) => input.unlockingBytecode.length !== 0) &&
      !verifyBchSignedTransaction(this.txBytes, this.prevouts, this.publicKey)
    )
      throw Error('Invalid or partially signed transaction');
  };

  isSigned = (): boolean => {
    this.validate();
    return verifyBchSignedTransaction(
      this.txBytes,
      this.prevouts,
      this.publicKey,
    );
  };

  getActualTxId = (): string | undefined =>
    this.isSigned() ? getBchActualTxId(this.txBytes) : undefined;

  withSignatures = (signatures: readonly string[]): BitcoinCashTransaction => {
    this.validate();
    return new BitcoinCashTransaction(
      this.eventId,
      buildBchSignedTransaction(
        this.txBytes,
        this.prevouts,
        this.publicKey,
        signatures,
      ),
      this.txType,
      this.prevouts,
      this.publicKey,
    );
  };

  getTxHexString = (): string => {
    this.validate();
    return binToHex(this.txBytes);
  };

  toJson = (): string => {
    this.validate();
    const result = JSON.stringify({
      network: this.network,
      eventId: this.eventId,
      txId: this.txId,
      txType: this.txType,
      txBytes: binToHex(this.txBytes),
      publicKey: this.publicKey,
      prevouts: this.prevouts.map(
        (prevout): BitcoinCashPrevoutJson => ({
          txId: prevout.txId,
          index: prevout.index,
          value: prevout.value.toString(),
          scriptPubKey: prevout.scriptPubKey,
          parentTransactionHex: prevout.parentTransactionHex,
        }),
      ),
    });
    if (result.length > BCH_MAX_ENVELOPE_CHARACTERS)
      throw Error('Envelope size limit exceeded');
    return result;
  };

  static fromJson = (json: string): BitcoinCashTransaction => {
    if (typeof json !== 'string' || json.length > BCH_MAX_ENVELOPE_CHARACTERS)
      throw Error('Envelope size limit exceeded');
    const obj = keys(JSON.parse(json), [
      'network',
      'eventId',
      'txId',
      'txType',
      'txBytes',
      'publicKey',
      'prevouts',
    ]);
    if (
      obj.network !== BITCOIN_CASH_CHAIN ||
      !Array.isArray(obj.prevouts) ||
      !obj.prevouts.length ||
      obj.prevouts.length > BCH_MAX_INPUTS
    )
      throw Error('Invalid BCH envelope');
    const prevouts = obj.prevouts.map((item): BitcoinCashPrevout => {
      const prevout = keys(item, [
        'txId',
        'index',
        'value',
        'scriptPubKey',
        'parentTransactionHex',
      ]);
      if (
        typeof prevout.index !== 'number' ||
        typeof prevout.value !== 'string' ||
        !/^[1-9][0-9]{0,15}$/.test(prevout.value)
      )
        throw Error('Invalid prevout numeric encoding');
      return {
        txId: text(prevout.txId),
        index: prevout.index,
        value: BigInt(prevout.value),
        scriptPubKey: assertBchHex(prevout.scriptPubKey, 25),
        parentTransactionHex: assertBchHex(
          prevout.parentTransactionHex,
          BCH_MAX_PARENT_TRANSACTION_BYTES,
        ),
      };
    });
    const result = new BitcoinCashTransaction(
      text(obj.eventId),
      hexToBin(assertBchHex(obj.txBytes, BCH_MAX_TRANSACTION_BYTES)),
      text(obj.txType) as TransactionType,
      prevouts,
      text(obj.publicKey),
    );
    if (obj.txId !== result.txId)
      throw Error('Approval transaction id mismatch');
    // Canonical JSON also excludes duplicate keys and alternative numeric encodings.
    if (result.toJson() !== json) throw Error('Noncanonical envelope JSON');
    return result;
  };
}

export default BitcoinCashTransaction;
