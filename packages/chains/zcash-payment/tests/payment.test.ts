import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { TransactionType, type EcdsaSignMediator } from '@rosen-chains/abstract-chain';
import {
  NativeZcashInspector,
  type NativeInspectionProvider,
} from '@rosen-bridge/rosen-extractor';
import {
  NativePaymentClient,
  ZcashPaymentError,
  ZcashSignProcessor,
  ZcashTransaction,
  type ConstructRequest,
  type ConstructResponse,
  type DigestRequest,
  type DigestResponse,
  type FinalizeRequest,
  type FinalizeResponse,
  type NativePaymentProvider,
  type ZcashPaymentIntent,
} from '../lib/index.js';

type NativeInspection = ReturnType<NativeInspectionProvider['inspect']>;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  assert.ok(value, `${name} is required for the native integration tests`);
  return value;
}

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`fixtures/${name}`, import.meta.url)), 'utf8')) as T;
}

interface WithdrawalInput {
  amount_zat: string;
  expected_branch_id: string;
  expiry_height: number;
  fee_zat: string;
  payout_script_hex: string;
  prevout: { amount_zat: string; script_pubkey_hex: string; txid: string; vout: number };
  reserve_pubkey_hex: string;
}
interface WithdrawalUnsigned { unsigned_tx_hex: string; output_scripts: string[]; change_zat: string }
interface TssFixture { digest: string; publicKey: string; signature: string; signatureRecovery: string }

const inputFixture = fixture<WithdrawalInput>('withdrawal-input.json');
const unsignedFixture = fixture<WithdrawalUnsigned>('withdrawal-unsigned.json');
const finalizedFixture = fixture<FinalizeResponse>('withdrawal-finalized.json');
const signatureFixture = fixture<TssFixture>('tss-signature.json');

const reserveAddress = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const payoutAddress = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const p2shAddress = 't2873udJLJhQopbsYPZZv558cRNKmTQoqTa';
const eventId = '11'.repeat(32);
const paymentBinary = requiredEnvironment('ZCASH_PAYMENT_BIN');
const paymentHash = requiredEnvironment('ZCASH_PAYMENT_SHA256');
const inspectorBinary = requiredEnvironment('ZCASH_INSPECTOR_BIN');
const inspectorHash = requiredEnvironment('ZCASH_INSPECTOR_SHA256');

const native = new NativePaymentClient({executablePath: paymentBinary, expectedSha256: paymentHash});
const inspector = new NativeZcashInspector({executablePath: inspectorBinary, expectedSha256: inspectorHash});

function intent(overrides: Partial<ZcashPaymentIntent> = {}): ZcashPaymentIntent {
  return {
    network: 'regtest',
    eventId,
    txType: TransactionType.payment,
    reserveAddress,
    branchId: inputFixture.expected_branch_id,
    lockTime: 0,
    expiryHeight: inputFixture.expiry_height,
    sequence: 0xffff_fffe,
    input: {
      txid: inputFixture.prevout.txid,
      index: inputFixture.prevout.vout,
      amountZat: BigInt(inputFixture.prevout.amount_zat),
      scriptPubKeyHex: inputFixture.prevout.script_pubkey_hex,
    },
    payments: [{
      address: payoutAddress,
      assets: {nativeToken: BigInt(inputFixture.amount_zat), tokens: []},
    }],
    feeZat: BigInt(inputFixture.fee_zat),
    ...overrides,
  };
}

function constructRequest(): ConstructRequest {
  return {
    expected_branch_id: inputFixture.expected_branch_id,
    lock_time: 0,
    expiry_height: inputFixture.expiry_height,
    input: {
      prevout_txid: inputFixture.prevout.txid,
      prevout_index: inputFixture.prevout.vout,
      sequence: 0xffff_fffe,
      amount_zat: Number(inputFixture.prevout.amount_zat),
      script_pubkey_hex: inputFixture.prevout.script_pubkey_hex,
    },
    outputs: [
      {value_zat: Number(inputFixture.amount_zat), script_pubkey_hex: inputFixture.payout_script_hex},
      {value_zat: Number(unsignedFixture.change_zat), script_pubkey_hex: inputFixture.prevout.script_pubkey_hex},
    ],
  };
}

function paymentError(code: string): (error: unknown) => boolean {
  return error => error instanceof ZcashPaymentError && error.code === code &&
    error.message === `Zcash payment ${code} failure`;
}

function providerWith(changes: {
  construct?: (value: ConstructResponse) => ConstructResponse;
  digest?: (value: DigestResponse) => DigestResponse;
  finalize?: (value: FinalizeResponse) => FinalizeResponse;
}): NativePaymentProvider {
  return {
    construct: request => changes.construct?.(native.construct(request)) ?? native.construct(request),
    digest: request => changes.digest?.(native.digest(request)) ?? native.digest(request),
    finalize: request => changes.finalize?.(native.finalize(request)) ?? native.finalize(request),
  };
}

function inspectorWith(change: (value: NativeInspection) => NativeInspection): NativeInspectionProvider {
  return {inspect: (raw, branch) => change(structuredClone(inspector.inspect(raw, branch)))};
}

function rewriteModel(json: string, change: (outer: Record<string, unknown>, payload: Record<string, unknown>) => void): string {
  const outer = JSON.parse(json) as Record<string, unknown>;
  const payload = JSON.parse(Buffer.from(outer.txBytes as string, 'hex').toString('utf8')) as Record<string, unknown>;
  change(outer, payload);
  outer.txBytes = Buffer.from(JSON.stringify(payload), 'utf8').toString('hex');
  return JSON.stringify(outer);
}

test('real native construction binds the frozen withdrawal bytes, digest, fee, txid, and payment order', () => {
  const transaction = ZcashTransaction.create(intent(), native, inspector);
  const digest = transaction.getDigest();

  assert.equal(transaction.getUnsignedHex(), unsignedFixture.unsigned_tx_hex);
  assert.equal(transaction.getSignedHex(), undefined);
  assert.equal(transaction.txId, '1e7e3e6c9c6f17660c1ac51c769b324fe4e9b53ff21231ff311d5c589a15bc72');
  assert.equal(transaction.eventId, eventId);
  assert.equal(transaction.network, 'zcash');
  assert.equal(transaction.txType, TransactionType.payment);
  assert.deepEqual(digest, {
    operation: 'digest',
    txid_raw: finalizedFixture.unsigned_txid_raw,
    sighash_all: signatureFixture.digest,
    actual_fee_zat: 10_000,
    zip317_conventional_fee_zat: 10_000,
  });
  assert.deepEqual(transaction.extractPaymentOrder(), intent().payments);

  const inspected = inspector.inspect(transaction.getUnsignedHex(), inputFixture.expected_branch_id);
  assert.deepEqual(inspected.transparent.outputs.map(output => [output.value_zat, output.script_pubkey_hex]), [
    [40_000_000, inputFixture.payout_script_hex],
    [59_990_000, inputFixture.prevout.script_pubkey_hex],
  ]);
});

test('unsigned and signed JSON round trips revalidate the exact approved intent and native bytes', () => {
  const approved = intent();
  const unsigned = ZcashTransaction.create(approved, native, inspector);
  const restoredUnsigned = ZcashTransaction.fromJson(unsigned.toJson(), approved, native, inspector);
  assert.equal(restoredUnsigned.toJson(), unsigned.toJson());
  assert.equal(restoredUnsigned.getSignedHex(), undefined);
  assert.equal(unsigned.validate(approved, native, inspector).toJson(), unsigned.toJson());

  const signed = unsigned.finalize(signatureFixture.signature, signatureFixture.publicKey, native, inspector);
  assert.equal(signed.getSignedHex(), finalizedFixture.signed_tx_hex);
  assert.equal(signed.txId, unsigned.txId, 'ZIP-244 v5 txid excludes authorization data');
  const restoredSigned = ZcashTransaction.fromJson(signed.toJson(), approved, native, inspector);
  assert.equal(restoredSigned.toJson(), signed.toJson());
  assert.equal(restoredSigned.getSignedHex(), finalizedFixture.signed_tx_hex);
});

test('returned values and public fields cannot mutate the canonical transaction snapshot', () => {
  const transaction = ZcashTransaction.create(intent(), native, inspector);
  const before = transaction.toJson();
  assert.ok(Object.isFrozen(transaction));
  assert.ok(Object.isFrozen(native));

  assert.throws(() => { (transaction as unknown as {txId: string}).txId = '22'.repeat(32); }, TypeError);
  const bytes = transaction.txBytes;
  bytes[0] ^= 0xff;
  const exposedIntent = transaction.getIntent();
  exposedIntent.input.amountZat = 1n;
  exposedIntent.payments[0].assets.nativeToken = 1n;
  const order = transaction.extractPaymentOrder();
  order[0].address = reserveAddress;

  assert.equal(transaction.toJson(), before);
  assert.equal(transaction.getIntent().input.amountZat, 100_000_000n);
  assert.equal(transaction.extractPaymentOrder()[0].address, payoutAddress);
});

test('payment to the reserve is rejected while change and exact-spend outputs remain valid', () => {
  const defaultTx = ZcashTransaction.create(intent(), native, inspector);
  assert.throws(() => ZcashTransaction.create(intent({payments: [{
    address: reserveAddress,
    assets: {nativeToken: 40_000_000n, tokens: []},
  }]}), native, inspector), paymentError('self_payment'));
  const noChange = ZcashTransaction.create(intent({payments: [{
    address: payoutAddress,
    assets: {nativeToken: 99_990_000n, tokens: []},
  }]}), native, inspector);

  const outputs = (tx: ZcashTransaction) => inspector.inspect(tx.getUnsignedHex(), inputFixture.expected_branch_id)
    .transparent.outputs.map(output => [output.value_zat, output.script_pubkey_hex]);
  assert.deepEqual(outputs(defaultTx), [
    [40_000_000, inputFixture.payout_script_hex],
    [59_990_000, inputFixture.prevout.script_pubkey_hex],
  ]);
  assert.deepEqual(outputs(noChange), [[99_990_000, inputFixture.payout_script_hex]]);
});

test('import rejects every independently changed approved-intent field', () => {
  const approved = intent();
  const json = ZcashTransaction.create(approved, native, inspector).toJson();
  const mutations: Array<[string, (value: ZcashPaymentIntent) => void]> = [
    ['network', value => { value.network = 'testnet'; }],
    ['eventId', value => { value.eventId = '22'.repeat(32); }],
    ['txType', value => { value.txType = TransactionType.reward; }],
    ['reserveAddress', value => { value.reserveAddress = payoutAddress; value.input.scriptPubKeyHex = inputFixture.payout_script_hex; }],
    ['branchId', value => { value.branchId = 'c8e71055'; }],
    ['lockTime', value => { value.lockTime = 1; }],
    ['expiryHeight', value => { value.expiryHeight += 1; }],
    ['sequence', value => { value.sequence -= 1; }],
    ['input.txid', value => { value.input.txid = '22'.repeat(32); }],
    ['input.index', value => { value.input.index = 1; }],
    ['input.amountZat', value => { value.input.amountZat += 1n; }],
    ['input.scriptPubKeyHex', value => { value.input.scriptPubKeyHex = inputFixture.payout_script_hex; }],
    ['payments.address', value => { value.payments[0].address = reserveAddress; }],
    ['payments.amount', value => { value.payments[0].assets.nativeToken += 1n; }],
    ['feeZat', value => { value.feeZat += 1n; }],
  ];
  for (const [name, mutate] of mutations) {
    const changed = structuredClone(approved);
    mutate(changed);
    assert.throws(() => ZcashTransaction.fromJson(json, changed, native, inspector), Error, name);
  }
});

test('import rejects outer and inner serialized field tampering and noncanonical shapes', () => {
  const approved = intent();
  const transaction = ZcashTransaction.create(approved, native, inspector);
  const json = transaction.toJson();
  const outerMutations: Array<[string, (outer: Record<string, unknown>) => void]> = [
    ['network', outer => { outer.network = 'bitcoin'; }],
    ['eventId', outer => { outer.eventId = '22'.repeat(32); }],
    ['txId', outer => { outer.txId = '22'.repeat(32); }],
    ['txType', outer => { outer.txType = TransactionType.reward; }],
    ['extra', outer => { outer.extra = true; }],
  ];
  for (const [name, mutate] of outerMutations) {
    const outer = JSON.parse(json) as Record<string, unknown>;
    mutate(outer);
    assert.throws(() => ZcashTransaction.fromJson(JSON.stringify(outer), approved, native, inspector), Error, name);
  }
  assert.throws(() => ZcashTransaction.fromJson(json.replace(/.$/, ''), approved, native, inspector), paymentError('model_encoding'));

  const innerMutations: Array<[string, (payload: Record<string, unknown>) => void]> = [
    ['schema', payload => { payload.schema = 2; }],
    ['intent', payload => {
      (payload.intent as Record<string, unknown>).eventId = '22'.repeat(32);
    }],
    ['unsignedTxHex', payload => { payload.unsignedTxHex = unsignedFixture.unsigned_tx_hex.slice(0, -2) + '01'; }],
    ['authorization', payload => { payload.authorization = {compactSignatureHex: '00', compressedPubkeyHex: '00', signedTxHex: '00'}; }],
    ['extra', payload => { payload.extra = true; }],
  ];
  for (const [name, mutate] of innerMutations) {
    const changed = rewriteModel(json, (_outer, payload) => mutate(payload));
    assert.throws(() => ZcashTransaction.fromJson(changed, approved, native, inspector), Error, name);
  }
});

test('unsupported recipient, network, asset, and amount forms fail before a payment candidate is returned', () => {
  const invalid: Array<[string, () => ZcashPaymentIntent]> = [
    ['P2SH', () => intent({payments: [{address: p2shAddress, assets: {nativeToken: 1n, tokens: []}}]})],
    ['shielded', () => intent({payments: [{address: 'zregtestsapling1qq', assets: {nativeToken: 1n, tokens: []}}]})],
    ['network', () => intent({network: 'mainnet'})],
    ['tokens', () => intent({payments: [{address: payoutAddress, assets: {nativeToken: 1n, tokens: [{id: 'asset', value: 1n}]}}]})],
    ['extra', () => intent({payments: [{address: payoutAddress, assets: {nativeToken: 1n, tokens: []}, extra: 'memo'}]})],
    ['zero payout', () => intent({payments: [{address: payoutAddress, assets: {nativeToken: 0n, tokens: []}}]})],
    ['insufficient', () => intent({payments: [{address: payoutAddress, assets: {nativeToken: 100_000_000n, tokens: []}}]})],
  ];
  for (const [name, make] of invalid) {
    assert.throws(() => ZcashTransaction.create(make(), native, inspector), Error, name);
  }
});

test('fixture signature mediator receives exactly the approved 32-byte digest and finalizes once', async () => {
  let calls = 0;
  const mediator: EcdsaSignMediator = {
    isInSign: async () => false,
    sign: async digest => {
      calls += 1;
      assert.equal(Buffer.from(digest).toString('hex'), signatureFixture.digest);
      assert.equal(digest.length, 32);
      return {signature: signatureFixture.signature, signatureRecovery: signatureFixture.signatureRecovery};
    },
  };
  const processor = new ZcashSignProcessor(native, inspector, mediator, signatureFixture.publicKey);
  assert.ok(Object.isFrozen(processor));
  const signed = await processor.sign(ZcashTransaction.create(intent(), native, inspector), intent());
  assert.equal(calls, 1);
  assert.equal(signed.getSignedHex(), finalizedFixture.signed_tx_hex);
  // This replays a historical synthetic fixture; it does not claim a fresh TSS ceremony.
});

test('signer snapshots intent and transaction bytes before awaiting the mediator', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const approved = intent();
  const transaction = ZcashTransaction.create(approved, native, inspector);
  const before = transaction.toJson();
  const mediator: EcdsaSignMediator = {
    isInSign: async () => false,
    sign: async digest => {
      await gate;
      assert.equal(Buffer.from(digest).toString('hex'), signatureFixture.digest);
      return {signature: signatureFixture.signature, signatureRecovery: signatureFixture.signatureRecovery};
    },
  };
  const pending = new ZcashSignProcessor(native, inspector, mediator, signatureFixture.publicKey).sign(transaction, approved);
  approved.eventId = '22'.repeat(32);
  approved.input.amountZat = 1n;
  transaction.txBytes[0] ^= 0xff;
  release();
  const signed = await pending;
  assert.equal(transaction.toJson(), before);
  assert.equal(signed.eventId, eventId);
  assert.equal(signed.getIntent().input.amountZat, 100_000_000n);
});

test('identical concurrent signing coalesces, while event or purpose differences do not', async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const mediator: EcdsaSignMediator = {
    isInSign: async () => false,
    sign: async () => {
      calls += 1;
      await gate;
      return {signature: signatureFixture.signature, signatureRecovery: signatureFixture.signatureRecovery};
    },
  };
  const processor = new ZcashSignProcessor(native, inspector, mediator, signatureFixture.publicKey);
  const approved = intent();
  const same = ZcashTransaction.create(approved, native, inspector);
  const first = processor.sign(same, approved);
  const second = processor.sign(same, approved);
  assert.equal(first, second);

  const otherEventIntent = intent({eventId: '22'.repeat(32)});
  const otherPurposeIntent = intent({txType: TransactionType.reward});
  const otherEvent = processor.sign(ZcashTransaction.create(otherEventIntent, native, inspector), otherEventIntent);
  const otherPurpose = processor.sign(ZcashTransaction.create(otherPurposeIntent, native, inspector), otherPurposeIntent);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 3);
  release();
  await Promise.all([first, second, otherEvent, otherPurpose]);
});

test('a rejected signing promise is evicted so the same canonical request can retry', async () => {
  let calls = 0;
  const mediator: EcdsaSignMediator = {
    isInSign: async () => false,
    sign: async () => {
      calls += 1;
      if (calls === 1) throw new Error('controlled rejection');
      return {signature: signatureFixture.signature, signatureRecovery: signatureFixture.signatureRecovery};
    },
  };
  const approved = intent();
  const transaction = ZcashTransaction.create(approved, native, inspector);
  const processor = new ZcashSignProcessor(native, inspector, mediator, signatureFixture.publicKey);
  await assert.rejects(processor.sign(transaction, approved), /controlled rejection/);
  const signed = await processor.sign(transaction, approved);
  assert.equal(calls, 2);
  assert.equal(signed.getSignedHex(), finalizedFixture.signed_tx_hex);
});

test('controlled single-field construction and inspection corruptions fail closed', () => {
  const constructionCases: Array<[string, NativePaymentProvider]> = [
    ['construct operation', providerWith({construct: value => ({...value, operation: 'digest'} as unknown as ConstructResponse)})],
    ['construct txid', providerWith({construct: value => ({...value, txid_raw: '00'.repeat(32)})})],
    ['construct digest', providerWith({construct: value => ({...value, sighash_all: '00'.repeat(32)})})],
    ['construct fee', providerWith({construct: value => ({...value, actual_fee_zat: value.actual_fee_zat + 1})})],
    ['construct ZIP317', providerWith({construct: value => ({...value, zip317_conventional_fee_zat: value.zip317_conventional_fee_zat + 1})})],
    ['digest operation', providerWith({digest: value => ({...value, operation: 'construct'} as unknown as DigestResponse)})],
    ['digest txid', providerWith({digest: value => ({...value, txid_raw: '00'.repeat(32)})})],
    ['digest digest', providerWith({digest: value => ({...value, sighash_all: '00'.repeat(32)})})],
    ['digest fee', providerWith({digest: value => ({...value, actual_fee_zat: value.actual_fee_zat + 1})})],
    ['digest ZIP317', providerWith({digest: value => ({...value, zip317_conventional_fee_zat: value.zip317_conventional_fee_zat + 1})})],
  ];
  for (const [name, changedNative] of constructionCases) {
    assert.throws(() => ZcashTransaction.create(intent(), changedNative, inspector), paymentError('construction_join'), name);
  }

  // Mutate one decoded field after real inspection so the model's join, rather
  // than the native client's schema decoder, must reject the inconsistency.
  const inspectionCases: Array<[string, string, (value: NativeInspection) => void]> = [
    ['version kind', 'inspection', value => { value.version.kind = 'v4'; }],
    ['version number', 'inspection', value => { value.version.number = 4; }],
    ['branch source', 'inspection', value => { value.branch_source = 'context'; }],
    ['branch', 'inspection', value => { value.consensus_branch_id = 'c8e71055'; }],
    ['txid', 'inspection', value => { value.txid = '00'.repeat(32); }],
    ['coinbase', 'inspection', value => { value.coinbase = true; }],
    ['fully transparent', 'inspection', value => { value.fully_transparent = false; }],
    ['shielded present', 'inspection', value => { value.shielded.present = true; }],
    ['transparent present', 'inspection', value => { value.transparent.present = false; }],
    ['lock time', 'inspection', value => { value.lock_time += 1; }],
    ['expiry height', 'inspection', value => { value.expiry_height! += 1; }],
    ['input count', 'inspection', value => { value.transparent.inputs.push(structuredClone(value.transparent.inputs[0])); }],
    ['output count', 'inspection', value => { value.transparent.outputs.pop(); }],
    ['input prevout', 'input_join', value => { value.transparent.inputs[0].prevout_txid = '00'.repeat(32); }],
    ['input index', 'input_join', value => { value.transparent.inputs[0].prevout_index += 1; }],
    ['input sequence', 'input_join', value => { value.transparent.inputs[0].sequence -= 1; }],
    ['input scriptSig', 'input_join', value => { value.transparent.inputs[0].script_sig_hex = '00'; }],
    ['output index', 'output_join', value => { value.transparent.outputs[0].index = 1; }],
    ['output value', 'output_join', value => { value.transparent.outputs[0].value_zat += 1; }],
    ['output script', 'output_join', value => { value.transparent.outputs[0].script_pubkey_hex = inputFixture.prevout.script_pubkey_hex; }],
    ['output script kind', 'output_join', value => { value.transparent.outputs[0].script_kind = 'scripthash'; }],
  ];
  for (const [name, code, mutate] of inspectionCases) {
    const changedInspector = inspectorWith(value => { mutate(value); return value; });
    assert.throws(() => ZcashTransaction.create(intent(), native, changedInspector), paymentError(code), name);
  }
});

test('controlled finalization corruptions, wrong public key, and malformed callback fail closed', async () => {
  const transaction = ZcashTransaction.create(intent(), native, inspector);
  const corruptions: Array<[string, (value: FinalizeResponse) => FinalizeResponse]> = [
    ['operation', value => ({...value, operation: 'digest'} as unknown as FinalizeResponse)],
    ['raw', value => ({...value, signed_tx_hex: value.signed_tx_hex.slice(0, -2) + '01'})],
    ['fee', value => ({...value, actual_fee_zat: value.actual_fee_zat + 1})],
    ['ZIP317', value => ({...value, zip317_conventional_fee_zat: value.zip317_conventional_fee_zat + 1})],
    ['digest', value => ({...value, sighash_all: '00'.repeat(32)})],
    ['DER', value => ({...value, der_signature_plus_type_hex: '00'})],
    ['scriptSig', value => ({...value, script_sig_hex: '00'})],
    ['callback', value => ({...value, callback_count: 2})],
    ['unsigned txid', value => ({...value, unsigned_txid_raw: '00'.repeat(32)})],
    ['txid', value => ({...value, signed_txid_raw: '00'.repeat(32)})],
  ];
  for (const [name, change] of corruptions) {
    assert.throws(() => transaction.finalize(signatureFixture.signature, signatureFixture.publicKey,
      providerWith({finalize: change}), inspector), paymentError('finalization_join'), name);
  }
  assert.throws(() => transaction.finalize(signatureFixture.signature,
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', native, inspector),
  paymentError('public_key'));

  const malformedMediator: EcdsaSignMediator = {
    isInSign: async () => false,
    sign: async () => ({signature: '00', signatureRecovery: '01'}),
  };
  await assert.rejects(new ZcashSignProcessor(native, inspector, malformedMediator, signatureFixture.publicKey)
    .sign(transaction, intent()), paymentError('hex'));
});

test('native client validates configuration, request shape, hash, and bounded refusal errors', () => {
  assert.throws(() => new NativePaymentClient({executablePath: 'relative.exe', expectedSha256: paymentHash}),
    paymentError('configuration'));
  assert.throws(() => new NativePaymentClient({executablePath: paymentBinary, expectedSha256: paymentHash.toUpperCase()}),
    paymentError('hex'));
  for (const timeoutMs of [0, -1, 2_147_483_648, 1.5]) {
    assert.throws(() => new NativePaymentClient({executablePath: paymentBinary, expectedSha256: paymentHash, timeoutMs}),
      Error, `timeout ${timeoutMs}`);
  }
  assert.throws(() => new NativePaymentClient({executablePath: paymentBinary, expectedSha256: '00'.repeat(32)})
    .construct(constructRequest()), paymentError('executable_hash'));
  assert.throws(() => new NativePaymentClient({
    executablePath: `${paymentBinary}.missing`, expectedSha256: paymentHash,
  }).construct(constructRequest()), paymentError('executable'));

  const invalidRequests: Array<[string, unknown]> = [
    ['input array', {...constructRequest(), input: Object.values(constructRequest().input)}],
    ['output array', {...constructRequest(), outputs: [[1, inputFixture.payout_script_hex]]}],
    ['empty outputs', {...constructRequest(), outputs: []}],
    ['extra field', {...constructRequest(), extra: true}],
    ['uppercase txid', {...constructRequest(), input: {...constructRequest().input, prevout_txid: inputFixture.prevout.txid.toUpperCase()}}],
    ['negative amount', {...constructRequest(), input: {...constructRequest().input, amount_zat: -1}}],
  ];
  for (const [name, request] of invalidRequests) {
    assert.throws(() => native.construct(request as ConstructRequest), Error, name);
  }

  const refusalRequest: DigestRequest = {
    unsigned_tx_hex: '00', expected_branch_id: inputFixture.expected_branch_id,
    input_amount_zat: 1, prevout_script_hex: inputFixture.prevout.script_pubkey_hex,
  };
  assert.throws(() => native.digest(refusalRequest), error => {
    assert.ok(paymentError('native_refusal')(error));
    assert.ok(error instanceof Error);
    assert.ok(!error.message.includes(paymentBinary));
    assert.ok(!error.message.includes(refusalRequest.unsigned_tx_hex));
    return true;
  });
});

test('native client sends the exact construct request and validates the frozen response', () => {
  const made = native.construct(constructRequest());
  assert.deepEqual(made, {
    operation: 'construct',
    unsigned_tx_hex: unsignedFixture.unsigned_tx_hex,
    txid_raw: finalizedFixture.unsigned_txid_raw,
    sighash_all: signatureFixture.digest,
    actual_fee_zat: 10_000,
    zip317_conventional_fee_zat: 10_000,
  });
});
