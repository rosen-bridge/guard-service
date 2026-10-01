import {
  binToHex,
  decodeTransactionBCH,
  encodeTransactionBCH,
  generateSigningSerializationBCH,
  hash256,
  hashTransaction,
  hexToBin,
  ripemd160,
  secp256k1,
  sha256,
} from '@bitauth/libauth';

import {
  BCH_MAX_INPUTS,
  BCH_MAX_ENVELOPE_CHARACTERS,
  BCH_MAX_MONEY,
  BCH_MAX_OUTPUTS,
  BCH_MAX_PARENT_TRANSACTION_BYTES,
  BCH_MAX_TRANSACTION_BYTES,
  BCH_SIGHASH_ALL_FORKID,
} from './constants';
import { BitcoinCashPrevout, BitcoinCashRawTransaction } from './types';

export const assertBchHex = (value: unknown, maxBytes: number): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxBytes * 2 ||
    !/^(?:[0-9a-f]{2})+$/.test(value)
  )
    throw Error('Expected bounded canonical lowercase hex');
  return value;
};

export const assertBchP2pkhScript = (script: unknown): string => {
  const hex = assertBchHex(script, 25);
  if (!/^76a914[0-9a-f]{40}88ac$/.test(hex))
    throw Error('Only native P2PKH treasury scripts are supported');
  return hex;
};

export const assertBchPublicKey = (publicKey: unknown): Uint8Array => {
  const hex = assertBchHex(publicKey, 33);
  if (!/^(?:02|03)[0-9a-f]{64}$/.test(hex))
    throw Error('Expected compressed secp256k1 public key');
  const bytes = hexToBin(hex);
  if (!secp256k1.validatePublicKey(bytes)) throw Error('Invalid public key');
  return bytes;
};

export const bchP2pkhScriptFromPublicKey = (publicKey: string): string =>
  `76a914${binToHex(ripemd160.hash(sha256.hash(assertBchPublicKey(publicKey))))}88ac`;

export const getBchOutpointId = (txId: string, index: number): string => {
  if (!/^[0-9a-f]{64}$/.test(txId))
    throw Error('Invalid outpoint transaction id');
  if (!Number.isInteger(index) || index < 0 || index > 0xffffffff)
    throw Error('Invalid outpoint index');
  return `${txId}.${index}`;
};

/** Parse untrusted bounded bytes, requiring their exact canonical encoding. */
export const decodeBchTransaction = (
  bytes: Uint8Array,
  maxBytes = BCH_MAX_TRANSACTION_BYTES,
): BitcoinCashRawTransaction => {
  if (
    !(bytes instanceof Uint8Array) ||
    !bytes.length ||
    bytes.length > maxBytes
  )
    throw Error('Transaction byte limit exceeded');
  // Buffer.slice aliases caller memory; libauth reverses sliced outpoint hashes.
  // A real Uint8Array makes those parser slices independent copies.
  const tx = decodeTransactionBCH(Uint8Array.from(bytes));
  if (typeof tx === 'string') throw Error(`Invalid BCH transaction: ${tx}`);
  if (tx.version !== 1 && tx.version !== 2)
    throw Error('Unsupported transaction version');
  if (!tx.inputs.length || !tx.outputs.length) throw Error('Empty transaction');
  if (binToHex(encodeTransactionBCH(tx)) !== binToHex(bytes))
    throw Error('Noncanonical transaction encoding');
  return tx;
};

export const getBchUnsignedBytes = (bytes: Uint8Array): Uint8Array => {
  const tx = decodeBchTransaction(bytes);
  tx.inputs.forEach((input) => (input.unlockingBytecode = new Uint8Array()));
  return encodeTransactionBCH(tx);
};

export const getBchApprovalTxId = (bytes: Uint8Array): string =>
  hashTransaction(getBchUnsignedBytes(bytes));

export const getBchActualTxId = (bytes: Uint8Array): string => {
  decodeBchTransaction(bytes);
  return hashTransaction(bytes);
};

/** Recovery equality ignores witnesses only; every approved body field is exact. */
export const isSameBchTransactionBody = (
  expected: Uint8Array,
  candidate: Uint8Array,
): boolean => {
  try {
    return (
      binToHex(getBchUnsignedBytes(expected)) ===
      binToHex(getBchUnsignedBytes(candidate))
    );
  } catch {
    return false;
  }
};

/** Reject tokens and authenticate every ordered prevout before digest construction. */
export const validateBchNativeTransaction = (
  bytes: Uint8Array,
  prevouts: readonly BitcoinCashPrevout[],
  treasuryScript: string,
): BitcoinCashRawTransaction => {
  assertBchP2pkhScript(treasuryScript);
  const tx = decodeBchTransaction(bytes);
  if (tx.inputs.length > BCH_MAX_INPUTS || tx.outputs.length > BCH_MAX_OUTPUTS)
    throw Error('Transaction cardinality limit exceeded');
  if (!Array.isArray(prevouts) || prevouts.length !== tx.inputs.length)
    throw Error('Prevout cardinality mismatch');
  let contextCharacters = bytes.length * 2;
  for (const prevout of prevouts) {
    if (!prevout || typeof prevout.parentTransactionHex !== 'string')
      throw Error('Missing authenticated parent context');
    contextCharacters += prevout.parentTransactionHex.length;
    if (contextCharacters > BCH_MAX_ENVELOPE_CHARACTERS)
      throw Error('Combined transaction context limit exceeded');
  }
  const seen = new Set<string>();
  let inputValue = 0n;
  tx.inputs.forEach((input, i) => {
    const txId = binToHex(input.outpointTransactionHash);
    const id = getBchOutpointId(txId, input.outpointIndex);
    if (seen.has(id)) throw Error('Duplicate input outpoint');
    seen.add(id);
    const prevout = prevouts[i];
    if (!prevout || getBchOutpointId(prevout.txId, prevout.index) !== id)
      throw Error('Ordered prevout mismatch');
    if (
      typeof prevout.value !== 'bigint' ||
      prevout.value <= 0n ||
      prevout.value > BCH_MAX_MONEY
    )
      throw Error('Invalid prevout value');
    if (prevout.scriptPubKey !== treasuryScript)
      throw Error('Unsupported mixed treasury scripts');
    const parentBytes = hexToBin(
      assertBchHex(
        prevout.parentTransactionHex,
        BCH_MAX_PARENT_TRANSACTION_BYTES,
      ),
    );
    const parent = decodeBchTransaction(
      parentBytes,
      BCH_MAX_PARENT_TRANSACTION_BYTES,
    );
    if (hashTransaction(parentBytes) !== txId)
      throw Error('Parent transaction hash mismatch');
    const actual = parent.outputs[input.outpointIndex];
    if (!actual) throw Error('Parent output missing');
    if (actual.token !== undefined)
      throw Error('CashTokens inputs are unsupported');
    if (
      actual.valueSatoshis !== prevout.value ||
      binToHex(actual.lockingBytecode) !== treasuryScript
    )
      throw Error('Authenticated prevout mismatch');
    inputValue += prevout.value;
  });
  let outputValue = 0n;
  tx.outputs.forEach((output) => {
    if (output.token !== undefined)
      throw Error('CashTokens outputs are unsupported');
    if (output.valueSatoshis <= 0n || output.valueSatoshis > BCH_MAX_MONEY)
      throw Error('Invalid output value');
    if (output.lockingBytecode.length > 10_000)
      throw Error('Output bytecode limit exceeded');
    outputValue += output.valueSatoshis;
  });
  if (inputValue > BCH_MAX_MONEY || outputValue > BCH_MAX_MONEY)
    throw Error('Transaction value limit exceeded');
  if (outputValue >= inputValue)
    throw Error('Transaction requires a positive fee');
  return tx;
};

export const getBchSigningPreimage = (
  bytes: Uint8Array,
  prevouts: readonly BitcoinCashPrevout[],
  treasuryScript: string,
  inputIndex: number,
): Uint8Array => {
  const tx = validateBchNativeTransaction(bytes, prevouts, treasuryScript);
  if (
    !Number.isInteger(inputIndex) ||
    inputIndex < 0 ||
    inputIndex >= tx.inputs.length
  )
    throw Error('Invalid signing input index');
  return generateSigningSerializationBCH(
    {
      transaction: tx,
      inputIndex,
      sourceOutputs: prevouts.map((prevout) => ({
        valueSatoshis: prevout.value,
        lockingBytecode: hexToBin(prevout.scriptPubKey),
      })),
    },
    {
      coveredBytecode: hexToBin(treasuryScript),
      signingSerializationType: Uint8Array.of(BCH_SIGHASH_ALL_FORKID),
    },
  );
};

export const getBchSigningDigest = (
  bytes: Uint8Array,
  prevouts: readonly BitcoinCashPrevout[],
  treasuryScript: string,
  inputIndex: number,
): Uint8Array =>
  hash256(getBchSigningPreimage(bytes, prevouts, treasuryScript, inputIndex));

export const buildBchSignedTransaction = (
  bytes: Uint8Array,
  prevouts: readonly BitcoinCashPrevout[],
  publicKey: string,
  signatures: readonly string[],
): Uint8Array => {
  const pk = assertBchPublicKey(publicKey);
  const script = bchP2pkhScriptFromPublicKey(publicKey);
  const tx = validateBchNativeTransaction(bytes, prevouts, script);
  if (tx.inputs.some((input) => input.unlockingBytecode.length !== 0))
    throw Error('Signing requires an unsigned body');
  if (!Array.isArray(signatures) || signatures.length !== tx.inputs.length)
    throw Error('Signature cardinality mismatch');
  tx.inputs.forEach((input, i) => {
    const signature = hexToBin(assertBchHex(signatures[i], 64));
    if (
      signature.length !== 64 ||
      !secp256k1.verifySignatureCompactLowS(
        signature,
        pk,
        getBchSigningDigest(bytes, prevouts, script, i),
      )
    )
      throw Error('Invalid low-S compact ECDSA signature');
    const der = secp256k1.signatureCompactToDER(signature);
    if (typeof der === 'string') throw Error(der);
    input.unlockingBytecode = Uint8Array.from([
      der.length + 1,
      ...der,
      BCH_SIGHASH_ALL_FORKID,
      pk.length,
      ...pk,
    ]);
  });
  const signed = encodeTransactionBCH(tx);
  if (!verifyBchSignedTransaction(signed, prevouts, publicKey))
    throw Error('Final signed transaction verification failed');
  return signed;
};

/** A label never establishes signed status: verify all minimal P2PKH witnesses. */
export const verifyBchSignedTransaction = (
  bytes: Uint8Array,
  prevouts: readonly BitcoinCashPrevout[],
  publicKey: string,
): boolean => {
  try {
    const pk = assertBchPublicKey(publicKey);
    const script = bchP2pkhScriptFromPublicKey(publicKey);
    const tx = validateBchNativeTransaction(bytes, prevouts, script);
    return tx.inputs.every((input, i) => {
      const witness = input.unlockingBytecode;
      const signatureLength = witness[0];
      if (
        signatureLength < 9 ||
        signatureLength > 73 ||
        witness.length !== signatureLength + 35 ||
        witness[signatureLength] !== BCH_SIGHASH_ALL_FORKID ||
        witness[signatureLength + 1] !== 33 ||
        binToHex(witness.slice(signatureLength + 2)) !== publicKey
      )
        return false;
      const der = witness.slice(1, signatureLength);
      const compact = secp256k1.signatureDERToCompact(der);
      if (typeof compact === 'string') return false;
      const canonical = secp256k1.signatureCompactToDER(compact);
      return (
        typeof canonical !== 'string' &&
        binToHex(canonical) === binToHex(der) &&
        secp256k1.verifySignatureDERLowS(
          der,
          pk,
          getBchSigningDigest(bytes, prevouts, script, i),
        )
      );
    });
  } catch {
    return false;
  }
};
