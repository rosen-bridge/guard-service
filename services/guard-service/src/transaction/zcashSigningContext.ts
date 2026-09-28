import { TransactionType } from '@rosen-chains/abstract-chain';

import {
  assertApprovalBinding,
  decodeTransactionApproval,
} from '../agreement/transactionApproval';

/** Immutable storage binding, not proof of approval validity or TSS authority. */
export interface ZcashSigningBinding {
  readonly schema: 1;
  readonly txId: string;
  readonly eventId: string;
  readonly approvedTxJson: string;
  readonly approvalEvidence: string;
  readonly requiredSign: number;
  readonly genesisHash: string;
  readonly outpoint: string;
  readonly sighashAll: string;
  readonly tssProfileHash: string;
}

const fields = [
  'schema',
  'txId',
  'eventId',
  'approvedTxJson',
  'approvalEvidence',
  'requiredSign',
  'genesisHash',
  'outpoint',
  'sighashAll',
  'tssProfileHash',
] as const;

const fail = (reason: string): never => {
  throw Error(`Invalid Zcash signing binding: ${reason}`);
};

const hex32 = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

/** Checks storage identity only. The chain must validate native signed bytes. */
export const assertZcashPaymentIdentity = (
  txJson: string,
  identity: Pick<ZcashSigningBinding, 'txId' | 'eventId'>,
): void => {
  if (typeof txJson !== 'string' || txJson.length > 4_000_000)
    fail('transaction encoding');
  const tx = JSON.parse(txJson);
  if (
    tx === null ||
    typeof tx !== 'object' ||
    Array.isArray(tx) ||
    Object.keys(tx).sort().join(',') !==
      'eventId,network,txBytes,txId,txType' ||
    tx.network !== 'zcash' ||
    tx.txType !== TransactionType.payment ||
    tx.txId !== identity.txId ||
    tx.eventId !== identity.eventId ||
    typeof tx.txBytes !== 'string' ||
    tx.txBytes.length === 0 ||
    tx.txBytes.length % 2 !== 0 ||
    !/^[0-9a-f]+$/.test(tx.txBytes)
  )
    fail('transaction identity');
  if (JSON.stringify(tx, Object.keys(tx).sort()) !== txJson)
    fail('noncanonical transaction');
};

export const encodeZcashSigningBinding = (
  value: ZcashSigningBinding,
): string => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Reflect.ownKeys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field))
  )
    fail('shape');
  // Capture primitive values once before validation; no caller object survives.
  const binding = Object.fromEntries(
    fields.map((field) => [field, value[field]]),
  ) as unknown as ZcashSigningBinding;
  if (
    binding.schema !== 1 ||
    !hex32(binding.txId) ||
    !hex32(binding.eventId) ||
    !hex32(binding.genesisHash) ||
    !hex32(binding.sighashAll) ||
    !hex32(binding.tssProfileHash) ||
    !Number.isSafeInteger(binding.requiredSign) ||
    binding.requiredSign < 1 ||
    typeof binding.outpoint !== 'string' ||
    !/^[0-9a-f]{64}:(0|[1-9][0-9]{0,9})$/.test(binding.outpoint) ||
    Number(binding.outpoint.slice(65)) > 0xffff_ffff
  )
    fail('fields');
  assertZcashPaymentIdentity(binding.approvedTxJson, binding);
  const approval = decodeTransactionApproval(binding.approvalEvidence);
  assertApprovalBinding(approval, binding.approvedTxJson, binding.requiredSign);
  return JSON.stringify(binding);
};

export const decodeZcashSigningBinding = (
  encoded: string,
): ZcashSigningBinding => {
  if (typeof encoded !== 'string' || encoded.length > 12_000_000)
    fail('encoding');
  const binding = JSON.parse(encoded) as ZcashSigningBinding;
  if (encodeZcashSigningBinding(binding) !== encoded)
    fail('noncanonical encoding');
  return Object.freeze(binding);
};
