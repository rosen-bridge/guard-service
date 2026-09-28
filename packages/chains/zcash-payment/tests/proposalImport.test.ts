import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {TransactionType} from '@rosen-chains/abstract-chain';
import {NativeZcashInspector} from '@rosen-bridge/rosen-extractor';
import {NativePaymentClient, ZcashPaymentError, ZcashTransaction, type ZcashPaymentIntent} from '../lib/index.js';

function required(name: string): string {const value = process.env[name]; assert.ok(value, `${name} required`); return value;}
const native = new NativePaymentClient({executablePath: required('ZCASH_PAYMENT_BIN'), expectedSha256: required('ZCASH_PAYMENT_SHA256')});
const inspector = new NativeZcashInspector({executablePath: required('ZCASH_INSPECTOR_BIN'), expectedSha256: required('ZCASH_INSPECTOR_SHA256')});
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8'));
const input = fixture('withdrawal-input.json'), signature = fixture('tss-signature.json');
function intent(): ZcashPaymentIntent {
  return {network: 'regtest', eventId: '11'.repeat(32), txType: TransactionType.payment,
    reserveAddress: 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt', branchId: input.expected_branch_id,
    lockTime: 0, expiryHeight: input.expiry_height, sequence: 0xffff_fffe,
    input: {txid: input.prevout.txid, index: input.prevout.vout, amountZat: BigInt(input.prevout.amount_zat), scriptPubKeyHex: input.prevout.script_pubkey_hex},
    payments: [{address: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs', assets: {nativeToken: BigInt(input.amount_zat), tokens: []}}],
    feeZat: BigInt(input.fee_zat)};
}
function rewrite(json: string, mutate: (outer: any, payload: any) => void): string {
  const outer = JSON.parse(json), payload = JSON.parse(Buffer.from(outer.txBytes, 'hex').toString('utf8'));
  mutate(outer, payload); outer.txBytes = Buffer.from(JSON.stringify(payload)).toString('hex'); return JSON.stringify(outer);
}
const paymentFailure = (code?: string) => (error: unknown) => error instanceof ZcashPaymentError && (code === undefined || error.code === code);

test('proposal inspection reconstructs unsigned and historical signed bytes without granting approval', () => {
  const unsigned = ZcashTransaction.create(intent(), native, inspector);
  const parsed = ZcashTransaction.inspectProposalJson(unsigned.toJson(), native, inspector);
  assert.equal(parsed.toJson(), unsigned.toJson()); assert.equal(parsed.getSignedHex(), undefined);
  const signed = unsigned.finalize(signature.signature, signature.publicKey, native, inspector);
  const imported = ZcashTransaction.inspectProposalJson(signed.toJson(), native, inspector);
  assert.equal(imported.toJson(), signed.toJson());
  assert.equal(imported.getSignedHex(), fixture('withdrawal-finalized.json').signed_tx_hex);
  assert.equal(imported.txId, parsed.txId);
  assert.equal(ZcashTransaction.fromJson(imported.toJson(), intent(), native, inspector).toJson(), signed.toJson());
});

test('distinct valid metadata shares native txid and digest but cannot reuse the original expected intent', async t => {
  const original = ZcashTransaction.create(intent(), native, inspector);
  const changes: Array<[string, Partial<ZcashPaymentIntent>]> = [
    ['event id', {eventId: '22'.repeat(32)}],
    ['transaction type', {txType: TransactionType.reward}],
    ['network label', {network: 'testnet'}],
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const proposal = ZcashTransaction.create({...intent(), ...change}, native, inspector);
    const parsed = ZcashTransaction.inspectProposalJson(proposal.toJson(), native, inspector);
    assert.equal(parsed.txId, original.txId); assert.deepEqual(parsed.getDigest(), original.getDigest());
    assert.notEqual(parsed.toJson(), original.toJson());
    assert.throws(() => ZcashTransaction.fromJson(parsed.toJson(), intent(), native, inspector), paymentFailure('intent_join'));
  });
});

test('proposal import rejects encoded schema loss, coercion and noncanonical serialization', async t => {
  const json = ZcashTransaction.create(intent(), native, inspector).toJson();
  const changes: Array<[string, (outer: any, payload: any) => void]> = [
    ['outer unknown', o => {o.extra = 1;}], ['outer missing', o => {delete o.eventId;}],
    ['payload unknown', (_, p) => {p.extra = 1;}], ['schema', (_, p) => {p.schema = 2;}],
    ['intent unknown', (_, p) => {p.intent.extra = 1;}], ['intent missing', (_, p) => {delete p.intent.network;}],
    ['intent array', (_, p) => {p.intent = [];}],
    ['input unknown', (_, p) => {p.intent.input.extra = 1;}], ['input missing', (_, p) => {delete p.intent.input.index;}],
    ['payment unknown', (_, p) => {p.intent.payments[0].extra = 1;}], ['payment missing', (_, p) => {delete p.intent.payments[0].address;}],
    ['payment array', (_, p) => {p.intent.payments[0] = [];}], ['payments object', (_, p) => {p.intent.payments = {};}],
    ['numeric amount', (_, p) => {p.intent.input.amountZat = 100000000;}],
    ['leading zero', (_, p) => {p.intent.input.amountZat = '0100000000';}],
    ['exponent amount', (_, p) => {p.intent.input.amountZat = '1e8';}],
    ['hex amount', (_, p) => {p.intent.input.amountZat = '0x5f5e100';}],
    ['plus amount', (_, p) => {p.intent.input.amountZat = '+100000000';}],
    ['space amount', (_, p) => {p.intent.input.amountZat = ' 100000000';}],
    ['negative amount', (_, p) => {p.intent.input.amountZat = '-1';}],
    ['fraction amount', (_, p) => {p.intent.input.amountZat = '100000000.0';}],
    ['oversized amount', (_, p) => {p.intent.input.amountZat = '9'.repeat(1000);}],
    ['numeric recipient', (_, p) => {p.intent.payments[0].amountZat = 40000000;}],
    ['numeric fee', (_, p) => {p.intent.feeZat = 10000;}],
    ['negative-zero fee', (_, p) => {p.intent.feeZat = '-0';}],
    ['unsigned bytes differ', (_, p) => {p.unsignedTxHex += '00';}],
    ['outer id differs', o => {o.txId = '00'.repeat(32);}],
    ['outer event differs', o => {o.eventId = '22'.repeat(32);}],
    ['authorization missing', (_, p) => {delete p.authorization;}],
    ['authorization empty', (_, p) => {p.authorization = {};}],
  ];
  for (const [name, mutate] of changes) await t.test(name, () => {
    assert.throws(() => ZcashTransaction.inspectProposalJson(rewrite(json, mutate), native, inspector), paymentFailure());
  });
  for (const [name, altered] of [
    ['outer whitespace', ' ' + json], ['outer duplicate', json.replace('{', '{"network":"zcash",')],
    ['payload duplicate', (() => {const o = JSON.parse(json); const p = Buffer.from(o.txBytes, 'hex').toString('utf8'); o.txBytes = Buffer.from(p.replace('{', '{"schema":1,')).toString('hex'); return JSON.stringify(o);})()],
    ['oversized JSON', ' '.repeat(1_000_001)], ['array root', '[]'],
  ]) await t.test(name, () => {
    assert.throws(() => ZcashTransaction.inspectProposalJson(altered, native, inspector), paymentFailure());
  });
});

test('signed proposal cannot normalize altered authorization or signed bytes', async t => {
  const signed = ZcashTransaction.create(intent(), native, inspector).finalize(signature.signature, signature.publicKey, native, inspector);
  for (const [name, change] of [
    ['extra authorization', (a: any) => {a.extra = 1;}],
    ['missing key', (a: any) => {delete a.compressedPubkeyHex;}],
    ['signed byte suffix', (a: any) => {a.signedTxHex += '00';}],
    ['signature encoding', (a: any) => {a.compactSignatureHex = a.compactSignatureHex.toUpperCase();}],
  ] as const) await t.test(name, () => {
    assert.throws(() => ZcashTransaction.inspectProposalJson(rewrite(signed.toJson(), (_, p) => change(p.authorization)), native, inspector), paymentFailure());
  });
});
