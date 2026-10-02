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

/**
 * Validate bounded string metadata for the persisted transaction envelope.
 * @param value - Untrusted metadata field
 * @returns The string unchanged when within BCH_MAX_METADATA_CHARACTERS
 * @throws When the field is not a bounded string
 */
const text = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > BCH_MAX_METADATA_CHARACTERS)
    throw Error('Invalid transaction metadata');
  return value;
};

/**
 * Require an object's own enumerable key set to match the envelope schema.
 * @param value - Parsed JSON object to validate
 * @param expected - Required field names, sorted in place during comparison
 * @returns The object for subsequent value validation
 * @throws When the object shape differs from the exact required key set
 */
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

  /**
   * Validate and copy a native treasury envelope with its ordered parent context.
   * @param eventId - Bounded Rosen event identifier
   * @param txBytes - Canonical unsigned or fully verified signed transaction bytes
   * @param txType - Supported Rosen transaction type
   * @param prevouts - Ordered exact parent-output context, copied and frozen per entry
   * @param publicKey - Canonical compressed treasury key
   * @throws When native policy, metadata, type or signed-witness validation fails
   */
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

  /**
   * Revalidate mutable envelope fields against their bytes and retained context.
   * @throws When identity, native policy or witness state is inconsistent
   */
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

  /**
   * Revalidate the envelope and verify every expected native P2PKH witness.
   * @returns Whether the envelope contains a fully verified signed transaction
   * @throws When the mutable envelope itself is inconsistent
   */
  isSigned = (): boolean => {
    this.validate();
    return verifyBchSignedTransaction(
      this.txBytes,
      this.prevouts,
      this.publicKey,
    );
  };

  /**
   * Resolve the exact on-chain identity only for a fully verified signed envelope.
   * @returns The signed transaction hash, or undefined for an unsigned envelope
   */
  getActualTxId = (): string | undefined =>
    this.isSigned() ? getBchActualTxId(this.txBytes) : undefined;

  /**
   * Finalize a new signed envelope without modifying this approved envelope.
   * @param signatures - Ordered canonical compact signatures for every input
   * @returns A validated signed envelope with the same approval identity and context
   * @throws When the body is already signed or supplied signatures do not verify
   */
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

  /**
   * Revalidate and serialize the exact transaction bytes.
   * @returns Canonical lowercase raw transaction hex
   */
  getTxHexString = (): string => {
    this.validate();
    return binToHex(this.txBytes);
  };

  /**
   * Revalidate and serialize the bounded canonical persisted envelope.
   * @returns Exact JSON with native prevout values encoded as decimal strings
   * @throws When envelope validation or the serialized size limit fails
   */
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

  /**
   * Restore an envelope only when its bounded JSON exactly matches canonical serialization.
   * @param json - Persisted envelope JSON including raw bytes and ordered parent context
   * @returns The validated unsigned or signed BCH envelope
   * @throws When JSON parsing, schema, native validation, identity or canonical encoding fails
   */
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
