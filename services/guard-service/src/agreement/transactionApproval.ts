import { blake2b } from 'blakejs';

import { Communicator } from '@rosen-bridge/communication';

export interface TransactionApprovalPolicy {
  protocolVersion: '1.0.0';
  guardPublicKeys: readonly string[];
  requiredSign: number;
}

export interface VerifiedTransactionApproval {
  schema: 1;
  approvedTxJson: string;
  txDataHash: string;
  timestamp: number;
  protocolVersion: '1.0.0';
  guardPublicKeys: string[];
  signatures: string[];
  requiredSign: number;
}

const MAX_PROPOSAL_BYTES = 16 * 1024 * 1024;
const MAX_RECORD_BYTES = 17 * 1024 * 1024;
const MAX_GUARDS = 256;
const RECORD_FIELDS = [
  'schema',
  'approvedTxJson',
  'txDataHash',
  'timestamp',
  'protocolVersion',
  'guardPublicKeys',
  'signatures',
  'requiredSign',
];
const fail = (reason: string): never => {
  throw new Error(`Invalid transaction approval: ${reason}`);
};

/** Same full-JSON digest used by transactionSerializer.getTxDataHash. */
export const calculateApprovalHash = (approvedTxJson: string): string =>
  Buffer.from(blake2b(approvedTxJson, undefined, 32)).toString('hex');

const snapshotPolicy = (
  policy: TransactionApprovalPolicy,
): TransactionApprovalPolicy => {
  if (
    policy.protocolVersion !== '1.0.0' ||
    !Array.isArray(policy.guardPublicKeys) ||
    policy.guardPublicKeys.length < 1 ||
    policy.guardPublicKeys.length > MAX_GUARDS
  )
    fail('policy shape');
  const guardPublicKeys = Array.from(policy.guardPublicKeys);
  if (
    guardPublicKeys.some(
      (key) => typeof key !== 'string' || !/^(02|03)[0-9a-f]{64}$/.test(key),
    ) ||
    new Set(guardPublicKeys).size !== guardPublicKeys.length ||
    !Number.isSafeInteger(policy.requiredSign) ||
    policy.requiredSign < 1 ||
    policy.requiredSign > guardPublicKeys.length
  )
    fail('membership or threshold');
  return Object.freeze({
    protocolVersion: policy.protocolVersion,
    guardPublicKeys: Object.freeze(guardPublicKeys),
    requiredSign: policy.requiredSign,
  });
};

/** Shape/hash consistency only; membership and signatures require independent replay. */
export const decodeTransactionApproval = (
  encoded: string,
): VerifiedTransactionApproval => {
  if (
    typeof encoded !== 'string' ||
    encoded.length > MAX_RECORD_BYTES ||
    Buffer.byteLength(encoded, 'utf8') > MAX_RECORD_BYTES
  )
    fail('record size');
  const record = JSON.parse(encoded) as VerifiedTransactionApproval;
  if (
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record) ||
    Object.keys(record).length !== RECORD_FIELDS.length ||
    RECORD_FIELDS.some((field) => !Object.hasOwn(record, field)) ||
    record.schema !== 1
  )
    fail('record shape');
  if (
    typeof record.approvedTxJson !== 'string' ||
    record.approvedTxJson.length === 0 ||
    record.approvedTxJson.length > MAX_PROPOSAL_BYTES ||
    Buffer.byteLength(record.approvedTxJson, 'utf8') > MAX_PROPOSAL_BYTES
  )
    fail('proposal size');
  const proposal = JSON.parse(record.approvedTxJson);
  if (
    !proposal ||
    typeof proposal !== 'object' ||
    Array.isArray(proposal) ||
    JSON.stringify(proposal) !== record.approvedTxJson
  )
    fail('proposal encoding');
  if (
    typeof record.txDataHash !== 'string' ||
    !/^[0-9a-f]{64}$/.test(record.txDataHash) ||
    calculateApprovalHash(record.approvedTxJson) !== record.txDataHash
  )
    fail('proposal hash');
  if (!Number.isSafeInteger(record.timestamp) || record.timestamp < 0)
    fail('timestamp');
  const policy = snapshotPolicy(record);
  if (
    !Array.isArray(record.signatures) ||
    record.signatures.length !== policy.guardPublicKeys.length
  )
    fail('signature indices');
  const signatures = Array.from(record.signatures);
  if (
    signatures.some(
      (signature) =>
        typeof signature !== 'string' ||
        (signature !== '' && !/^[0-9a-f]{128}$/.test(signature)),
    ) ||
    signatures.filter((signature) => signature !== '').length <
      policy.requiredSign
  )
    fail('signatures or quorum');
  const result: VerifiedTransactionApproval = {
    schema: 1,
    approvedTxJson: record.approvedTxJson,
    txDataHash: record.txDataHash,
    timestamp: record.timestamp,
    protocolVersion: policy.protocolVersion,
    guardPublicKeys: [...policy.guardPublicKeys],
    signatures,
    requiredSign: policy.requiredSign,
  };
  // Also rejects duplicate fields, whitespace and alternative field orders.
  if (JSON.stringify(result) !== encoded) fail('record encoding');
  Object.freeze(result.guardPublicKeys);
  Object.freeze(result.signatures);
  return Object.freeze(result);
};

/** Copies producer inputs synchronously; the result must be verified before use. */
export const createTransactionApproval = (
  approvedTxJson: string,
  timestamp: number,
  signatures: readonly string[],
  policy: TransactionApprovalPolicy,
): string => {
  const snapshot = snapshotPolicy(policy);
  if (
    !Array.isArray(signatures) ||
    signatures.length !== snapshot.guardPublicKeys.length
  )
    fail('signature indices');
  const encoded = JSON.stringify({
    schema: 1,
    approvedTxJson,
    txDataHash: calculateApprovalHash(approvedTxJson),
    timestamp,
    protocolVersion: snapshot.protocolVersion,
    guardPublicKeys: snapshot.guardPublicKeys,
    signatures: Array.from(signatures),
    requiredSign: snapshot.requiredSign,
  });
  decodeTransactionApproval(encoded);
  return encoded;
};

export const assertApprovalBinding = (
  approval: VerifiedTransactionApproval,
  approvedTxJson: string,
  requiredSign: number,
): void => {
  if (
    approval.approvedTxJson !== approvedTxJson ||
    approval.requiredSign !== requiredSign ||
    approval.txDataHash !== calculateApprovalHash(approvedTxJson)
  )
    fail('proposal or threshold binding');
};

export const assertApprovalPolicy = (
  approval: VerifiedTransactionApproval,
  policy: TransactionApprovalPolicy,
): void => {
  const snapshot = snapshotPolicy(policy);
  if (
    approval.protocolVersion !== snapshot.protocolVersion ||
    approval.requiredSign !== snapshot.requiredSign ||
    JSON.stringify(approval.guardPublicKeys) !==
      JSON.stringify(snapshot.guardPublicKeys)
  )
    fail('trusted policy mismatch');
};

/**
 * Replays the existing 1.0.0 peer signatures. The threshold/membership snapshot
 * is local policy evidence, not an additional peer-signed field. This establishes
 * neither event currentness nor a TSS attempt lease; consumers must check those.
 */
export const verifyTransactionApproval = async (
  encoded: string,
  trustedPolicy: TransactionApprovalPolicy,
  verifier: {
    verify(
      message: string,
      signature: string,
      publicKey: string,
    ): Promise<boolean>;
  },
): Promise<VerifiedTransactionApproval> => {
  const approval = decodeTransactionApproval(encoded);
  const policy = snapshotPolicy(trustedPolicy);
  assertApprovalPolicy(approval, policy);
  const verify = verifier.verify.bind(verifier);
  for (let index = 0; index < approval.signatures.length; index++) {
    const signature = approval.signatures[index];
    if (signature === '') continue;
    const publicKey = approval.guardPublicKeys[index];
    const message = Communicator.generatePayloadToSign(
      { txDataHash: approval.txDataHash },
      approval.timestamp,
      publicKey,
      approval.protocolVersion,
    );
    if (!(await verify(message, signature, publicKey)))
      fail(`signature at index ${index}`);
  }
  return approval;
};
