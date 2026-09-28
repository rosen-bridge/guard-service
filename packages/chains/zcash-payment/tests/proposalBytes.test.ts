import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {TransactionType} from '@rosen-chains/abstract-chain';
import {NativeZcashInspector} from '@rosen-bridge/rosen-extractor';
import {NativePaymentClient, ZcashPaymentError, ZcashTransaction, type ZcashPaymentIntent} from '../lib/index.js';

function required(name: string): string {const value = process.env[name]; assert.ok(value, name); return value;}
const native = new NativePaymentClient({executablePath: required('ZCASH_PAYMENT_BIN'), expectedSha256: required('ZCASH_PAYMENT_SHA256')});
const inspector = new NativeZcashInspector({executablePath: required('ZCASH_INSPECTOR_BIN'), expectedSha256: required('ZCASH_INSPECTOR_SHA256')});
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8'));
const input = fixture('withdrawal-input.json'), signature = fixture('tss-signature.json');
const intent: ZcashPaymentIntent = {
  network: 'regtest', eventId: '11'.repeat(32), txType: TransactionType.payment,
  reserveAddress: 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt', branchId: input.expected_branch_id,
  lockTime: 0, expiryHeight: input.expiry_height, sequence: 0xffff_fffe,
  input: {txid: input.prevout.txid, index: input.prevout.vout, amountZat: BigInt(input.prevout.amount_zat), scriptPubKeyHex: input.prevout.script_pubkey_hex},
  payments: [{address: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs', assets: {nativeToken: BigInt(input.amount_zat), tokens: []}}],
  feeZat: BigInt(input.fee_zat),
};
const unsigned = ZcashTransaction.create(intent, native, inspector);
const signed = unsigned.finalize(signature.signature, signature.publicKey, native, inspector);
const encode = (transaction: ZcashTransaction) => Buffer.from(transaction.txBytes).toString('hex');
const parse = (bytes: string) => ZcashTransaction.inspectProposalBytes(bytes, native, inspector);
const invalid = (error: unknown) => error instanceof ZcashPaymentError;

test('the guard event processor signed txBytes format restores the full canonical transaction', () => {
  // eventProcessor.ts serializes txBytes, not the signed native transaction hex.
  const serialized = encode(signed);
  assert.notEqual(serialized, signed.getSignedHex());
  const restored = parse(serialized);
  assert.equal(restored.toJson(), signed.toJson());
  assert.equal(restored.getSignedHex(), fixture('withdrawal-finalized.json').signed_tx_hex);
  assert.deepEqual(restored.getIntent().input, intent.input);
  assert.equal(parse(encode(unsigned)).toJson(), unsigned.toJson());
});

test('payload bytes enforce canonical encoding and native identity before exposing an input', async t => {
  const bytes = encode(signed), text = Buffer.from(bytes, 'hex').toString('utf8');
  const mutate = (change: (payload: any) => void) => {
    const payload = JSON.parse(text); change(payload); return Buffer.from(JSON.stringify(payload)).toString('hex');
  };
  for (const [name, altered] of [
    ['native hex instead of payload', signed.getSignedHex()!],
    ['outer JSON instead of payload', Buffer.from(signed.toJson()).toString('hex')],
    ['upper hex', bytes.toUpperCase()], ['odd hex', bytes + '0'], ['invalid utf8', 'ff'],
    ['empty', ''], ['over limit', '00'.repeat(500_001)],
    ['whitespace', Buffer.from(' ' + text).toString('hex')],
    ['duplicate field', Buffer.from(text.replace('{', '{"schema":1,')).toString('hex')],
    ['schema', mutate(p => {p.schema = 2;})],
    ['unsigned bytes', mutate(p => {p.unsignedTxHex += '00';})],
    ['signed bytes', mutate(p => {p.authorization.signedTxHex += '00';})],
    ['input amount', mutate(p => {p.intent.input.amountZat = '99999999';})],
    ['outpoint', mutate(p => {p.intent.input.txid = 'aa'.repeat(32);})],
    ['unknown field', mutate(p => {p.extra = 1;})],
    ['missing authorization', mutate(p => {delete p.authorization;})],
  ]) await t.test(name, () => assert.throws(() => parse(altered), invalid));
});

test('payload metadata inspection grants no approval for a different event with the same native txid', () => {
  const alternative = ZcashTransaction.create({...intent, eventId: '22'.repeat(32)}, native, inspector);
  const proposal = parse(encode(alternative));
  assert.equal(proposal.txId, unsigned.txId);
  assert.notEqual(proposal.toJson(), unsigned.toJson());
  assert.throws(() => proposal.validate(intent, native, inspector), invalid);
});
