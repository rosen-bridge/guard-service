import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {TransactionType, type PaymentOrder} from '@rosen-chains/abstract-chain';
import {TokenMap, type RosenTokens} from '@rosen-bridge/tokens';
import {createZcashAddressCodec} from '@rosen-bridge/address-codec-zcash';
import {NativeZcashInspector} from '@rosen-bridge/rosen-extractor';
import {NativePaymentClient, ZcashTransaction, type ZcashPaymentIntent} from '@rosen-chains/zcash-payment';
import {ZcashPaymentGenerator, ZcashGenerationError} from '../lib/zcashGeneration.js';
import type {ZcashDiscoverySource} from '../lib/utxoSnapshot.js';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8'));
// The planner receipt and payment package's historical signature retain their original provenance.
const paymentFixture = (name: string) => JSON.parse(readFileSync(new URL(`../../zcash-payment/tests/fixtures/${name}`, import.meta.url), 'utf8'));
const live = fixture('payment-planner-live-evidence.json');
const withdrawal = paymentFixture('withdrawal-input.json'), signature = paymentFixture('tss-signature.json');
function env(name: string): string {const value = process.env[name]; assert.ok(value, name); return value;}
const native = new NativePaymentClient({executablePath: env('ZCASH_PAYMENT_BIN'), expectedSha256: env('ZCASH_PAYMENT_SHA256')});
const inspector = new NativeZcashInspector({executablePath: env('ZCASH_INSPECTOR_BIN'), expectedSha256: env('ZCASH_INSPECTOR_SHA256')});
const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt', payout = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const eventId = '33'.repeat(32);
const order = (): PaymentOrder => [{address: payout, assets: {nativeToken: 10_000_000n, tokens: []}}];
const historicalIntent: ZcashPaymentIntent = {
  network: 'regtest', eventId, txType: TransactionType.payment, reserveAddress: reserve,
  branchId: withdrawal.expected_branch_id, lockTime: 0, expiryHeight: withdrawal.expiry_height, sequence: 0xffff_fffe,
  input: {txid: withdrawal.prevout.txid, index: withdrawal.prevout.vout, amountZat: BigInt(withdrawal.prevout.amount_zat), scriptPubKeyHex: withdrawal.prevout.script_pubkey_hex},
  payments: [{address: payout, assets: {nativeToken: BigInt(withdrawal.amount_zat), tokens: []}}], feeZat: BigInt(withdrawal.fee_zat),
};
const historical = ZcashTransaction.create(historicalIntent, native, inspector);
const signed = historical.finalize(signature.signature, signature.publicKey, native, inspector);
const serialized = (tx: ZcashTransaction) => Buffer.from(tx.txBytes).toString('hex');
const config = (): RosenTokens => [{
  zcash: {tokenId: 'zec', name: 'ZEC', decimals: 8, type: 'native', residency: 'native', extra: {}},
  ergo: {tokenId: 'ab'.repeat(32), name: 'rsZEC', decimals: 8, type: 'token', residency: 'wrapped', extra: {}},
}];
async function setup() {
  const tokens = new TokenMap(); await tokens.updateConfigByJson(config());
  const calls: string[] = [];
  const observed = (method: string) => structuredClone(live.observations.find((entry: any) => entry.method === method).result);
  const [txid, index] = live.positive.outpoint.split(':');
  const rows = [{address: reserve, txid, outputIndex: Number(index), script: live.positive.scriptPubKeyHex,
    satoshis: Number(live.positive.amountZat), height: live.positive.tipHeight}];
  let pause: (() => Promise<void>) | undefined;
  const source: ZcashDiscoverySource = {
    async getGenesisHash() {calls.push('genesis'); await pause?.(); return observed('getGenesisHash');},
    async getBlockchainInfo() {return observed('getBlockchainInfo');},
    async getAddressUtxos() {return {utxos: structuredClone(rows), hash: live.positive.tipHash, height: live.positive.tipHeight};},
    async getTxOut(id, n) {calls.push(`txout:${id}.${n}`); assert.equal(id, txid); assert.equal(n, Number(index)); return observed('getTxOut');},
    async getBlockHash() {return live.positive.tipHash;},
    async getTransaction(id) {assert.equal(id, txid); return observed('getTransaction');},
  };
  const options = {source, policy: structuredClone(live.policy), native, inspector, reserveAddress: reserve,
    feeFloorZat: 10_000n, maximumFeeZat: 20_000n, expiryDelta: 200, tokens};
  return {tokens, calls, rows, options, pause: (callback: () => Promise<void>) => {pause = callback;}};
}
const failure = (code: string) => (error: unknown) => error instanceof ZcashGenerationError && error.code === code;

test('real Rosen generation signature returns the native planner golden without successor chaining', async () => {
  const f = await setup();
  const result = await new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, TransactionType.payment, order(), [], []);
  assert.equal(result.length, 1); assert.equal(result[0].getUnsignedHex(), live.unsignedTxHex);
  assert.equal(result[0].getSignedHex(), undefined);
});

test('active unsigned and historical signed txBytes exclude their inputs before source qualification', async () => {
  const f = await setup();
  const unsigned = ZcashTransaction.create({...historicalIntent, expiryHeight: 1, input: {...historicalIntent.input, index: 1}}, native, inspector);
  for (const tx of [unsigned, signed]) {
    const input = tx.getIntent().input;
    f.rows.unshift({address: reserve, txid: input.txid, outputIndex: input.index, script: input.scriptPubKeyHex,
      satoshis: Number(input.amountZat), height: 106});
  }
  let activeConstructions = 0;
  const counted = {
    construct: (request: Parameters<typeof native.construct>[0]) => {
      if (request.input.prevout_txid === historicalIntent.input.txid) activeConstructions++;
      return native.construct(request);
    },
    digest: native.digest.bind(native), finalize: native.finalize.bind(native),
  };
  const result = await new ZcashPaymentGenerator({...f.options, native: counted}).generateMultipleTransactions(eventId, TransactionType.payment, order(), [unsigned], [serialized(signed)]);
  assert.equal(result[0].getUnsignedHex(), live.unsignedTxHex);
  assert.equal(f.calls.filter(call => call.startsWith('txout:')).length, 1);
  assert.equal(activeConstructions, 2, 'one canonical parse per active model, no planner construction for either');
});

test('rejects malformed active lists, mixed contexts, states and unsupported calls before discovery', async t => {
  for (const [name, unsigned, signedList, type, extra, code] of [
    ['signed in unsigned', [signed], [], TransactionType.payment, [], 'active_state'],
    ['unsigned in signed', [], [serialized(historical)], TransactionType.payment, [], 'active_state'],
    ['native hex', [], [signed.getSignedHex()], TransactionType.payment, [], 'active_encoding'],
    ['malformed signed', [], ['ff'], TransactionType.payment, [], 'active_encoding'],
    ['null unsigned', [null], [], TransactionType.payment, [], 'active_encoding'],
    ['sparse unsigned', new Array(1), [], TransactionType.payment, [], 'active_encoding'],
    ['too many signed', [], Array(5001).fill('00'), TransactionType.payment, [], 'active_list'],
    ['reward', [], [], TransactionType.reward, [], 'unsupported_call'],
    ['cold storage', [], [], TransactionType.coldStorage, [], 'unsupported_call'],
    ['lock', [], [], TransactionType.lock, [], 'unsupported_call'],
    ['manual', [], [], TransactionType.manual, [], 'unsupported_call'],
    ['arbitrary', [], [], TransactionType.arbitrary, [], 'unsupported_call'],
    ['unknown type', [], [], 'unsupported' as TransactionType, [], 'unsupported_call'],
    ['extra', [], [], TransactionType.payment, [undefined], 'unsupported_call'],
    ['network', [ZcashTransaction.create({...historicalIntent, network: 'testnet'}, native, inspector)], [], TransactionType.payment, [], 'active_context'],
    ['reserve', [ZcashTransaction.create({...historicalIntent, reserveAddress: payout, input: {...historicalIntent.input,
      scriptPubKeyHex: createZcashAddressCodec('regtest').parseAddress(payout).scriptPubKeyHex}}, native, inspector)], [], TransactionType.payment, [], 'active_context'],
  ] as const) await t.test(name, async () => {
    const f = await setup();
    await assert.rejects(new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, type, order(), unsigned as any, signedList as any, ...extra), failure(code));
    assert.deepEqual(f.calls, []);
  });
});

test('malformed orders are rejected before native planning or discovery', async t => {
  for (const [name, alter] of [
    ['empty', (o: PaymentOrder) => o.splice(0)],
    ['sparse', (o: PaymentOrder) => {delete o[0];}],
    ['number amount', (o: PaymentOrder) => {(o[0].assets as any).nativeToken = 1;}],
    ['zero amount', (o: PaymentOrder) => {o[0].assets.nativeToken = 0n;}],
    ['tokens', (o: PaymentOrder) => {o[0].assets.tokens.push({id: 'ab'.repeat(32), value: 1n});}],
    ['extra', (o: PaymentOrder) => {(o[0] as any).extra = 'unsupported';}],
    ['unknown', (o: PaymentOrder) => {(o[0] as any).ignored = true;}],
  ] as const) await t.test(name, async () => {
    const f = await setup(), payments = order(); alter(payments);
    await assert.rejects(new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, TransactionType.payment, payments, [], []), failure('payments'));
    assert.deepEqual(f.calls, []);
  });
});

test('both real TokenMap conversion results must preserve exact zatoshis and eight decimals', async t => {
  for (const method of ['unwrapAmount', 'wrapAmount'] as const) {
    for (const field of ['amount', 'decimals'] as const) await t.test(`${method}.${field}`, async () => {
      const f = await setup(), original = f.tokens[method].bind(f.tokens);
      f.tokens[method] = (...args) => {
        const result = original(...args);
        return field === 'amount' ? {...result, amount: result.amount + 1n} : {...result, decimals: 7};
      };
      await assert.rejects(new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, TransactionType.payment, order(), [], []), failure('token_conversion'));
      assert.deepEqual(f.calls, []);
    });
  }
});

test('rejects missing, ambiguous and rounding token mappings', async t => {
  for (const [name, change] of [
    ['missing', (c: RosenTokens) => c.splice(0)],
    ['zec alias', (c: RosenTokens) => c.push({other: {...c[0].zcash}})],
    ['source decimals', (c: RosenTokens) => {c[0].zcash.decimals = 9;}],
    ['ergo decimals', (c: RosenTokens) => {c[0].ergo.decimals = 7;}],
    ['third rounding', (c: RosenTokens) => {c[0].third = {...c[0].ergo, decimals: 6};}],
    ['third oversized', (c: RosenTokens) => {c[0].third = {...c[0].ergo, decimals: 19};}],
  ] as const) await t.test(name, async () => {
    const f = await setup(), c = config(); change(c); await f.tokens.updateConfigByJson(c);
    await assert.rejects(async () => new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, TransactionType.payment, order(), [], []), failure('token_configuration'));
    assert.deepEqual(f.calls, []);
  });
});

test('copies caller order and active lists before the first source await', async () => {
  const f = await setup(); let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;}); f.pause(() => gate);
  const payments = order(), unsigned: ZcashTransaction[] = [], signedList: string[] = [];
  const pending = new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, TransactionType.payment, payments, unsigned, signedList);
  payments[0].assets.nativeToken = 1n; payments[0].address = reserve; unsigned.push(signed); signedList.push('bad');
  release(); assert.equal((await pending)[0].getUnsignedHex(), live.unsignedTxHex);
});

test('rejects token configuration change and restore while source evidence is pending', async () => {
  const f = await setup(); let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;}); f.pause(() => gate);
  const pending = new ZcashPaymentGenerator(f.options).generateMultipleTransactions(eventId, TransactionType.payment, order(), [], []);
  const changed = config(); changed[0].ergo.tokenId = 'cd'.repeat(32);
  await f.tokens.updateConfigByJson(changed); await f.tokens.updateConfigByJson(config());
  release(); await assert.rejects(pending, failure('token_configuration_changed'));
});
