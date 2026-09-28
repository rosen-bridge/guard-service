import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import {TransactionType, type EcdsaSignMediator} from '@rosen-chains/abstract-chain';
import {
  NativeInspectionError,
  NativeZcashInspector,
  type NativeInspectionProvider,
} from '@rosen-bridge/rosen-extractor';
import {
  NativePaymentClient,
  SourceCheckedZcashSigner,
  ZcashTransaction,
  ZcashPaymentEvidence,
  ZcashPaymentEvidenceError,
  decimalZecToZatoshis,
  type ZcashEvidenceSource,
  type ZcashPaymentIntent,
  type ZcashSourcePolicy,
} from '../lib/index.js';

type NativeInspection = ReturnType<NativeInspectionProvider['inspect']>;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  assert.ok(value, name + ' is required for the native integration tests');
  return value;
}
function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL('fixtures/' + name, import.meta.url)), 'utf8')) as T;
}

interface WithdrawalInput {
  amount_zat: string; expected_branch_id: string; expiry_height: number; fee_zat: string;
  payout_script_hex: string;
  prevout: {amount_zat: string; script_pubkey_hex: string; txid: string; vout: number};
}
interface WithdrawalUnsigned {unsigned_tx_hex: string}
interface SignatureFixture {digest: string; publicKey: string; signature: string; signatureRecovery: string}
interface DeliveredBlock {
  block: {height: number; hash: string};
  transactions: Array<Record<string, unknown>>;
}

const withdrawal = fixture<WithdrawalInput>('withdrawal-input.json');
const frozenUnsigned = fixture<WithdrawalUnsigned>('withdrawal-unsigned.json');
const signature = fixture<SignatureFixture>('tss-signature.json');
const delivered = fixture<DeliveredBlock>('payment-evidence-block-106.json');
const previousTransaction = delivered.transactions.find(tx => tx.txid === withdrawal.prevout.txid);
assert.ok(previousTransaction, 'canonical block must contain the withdrawal prevout');

const payment = new NativePaymentClient({
  executablePath: requiredEnvironment('ZCASH_PAYMENT_BIN'),
  expectedSha256: requiredEnvironment('ZCASH_PAYMENT_SHA256'),
});
const inspector = new NativeZcashInspector({
  executablePath: requiredEnvironment('ZCASH_INSPECTOR_BIN'),
  expectedSha256: requiredEnvironment('ZCASH_INSPECTOR_SHA256'),
});

const GENESIS = '029f11d80ef9765602235e1bc9727e3eb6ba20839319f761fee920d63401e327';
const TIP = delivered.block.hash;
const OLD_BRANCH = 'c2d6d0b4';
const NEXT_BRANCH = 'c8e71055';
const RESERVE = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const PAYOUT = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const OTHER_HASH = '55'.repeat(32);

function paymentIntent(overrides: Partial<ZcashPaymentIntent> = {}): ZcashPaymentIntent {
  return {
    network: 'regtest', eventId: '11'.repeat(32), txType: TransactionType.payment,
    reserveAddress: RESERVE, branchId: NEXT_BRANCH, lockTime: 0, expiryHeight: 306,
    sequence: 0xffff_fffe,
    input: {
      txid: withdrawal.prevout.txid, index: withdrawal.prevout.vout,
      amountZat: BigInt(withdrawal.prevout.amount_zat),
      scriptPubKeyHex: withdrawal.prevout.script_pubkey_hex,
    },
    payments: [{address: PAYOUT, assets: {nativeToken: BigInt(withdrawal.amount_zat), tokens: []}}],
    feeZat: BigInt(withdrawal.fee_zat),
    ...overrides,
  };
}

const currentIntent = paymentIntent();
const currentCandidate = ZcashTransaction.create(currentIntent, payment, inspector);
const historicalIntent = paymentIntent({branchId: OLD_BRANCH});
const historicalCandidate = ZcashTransaction.create(historicalIntent, payment, inspector);
assert.equal(historicalCandidate.getUnsignedHex(), frozenUnsigned.unsigned_tx_hex);

function policy(upgrade = true, maximumExpiryDelta = 200): ZcashSourcePolicy {
  return {
    network: 'regtest', genesisHash: GENESIS, sourceId: 'controlled-zebra',
    branches: upgrade
      ? [{height: 0, branchId: OLD_BRANCH}, {height: 107, branchId: NEXT_BRANCH}]
      : [{height: 0, branchId: OLD_BRANCH}],
    minimumConfirmations: 1, maximumExpiryDelta,
  };
}
interface SourceState {
  genesis: unknown; info: unknown; infoAfter?: unknown; txout: unknown;
  blockHash: unknown; transaction: unknown;
}
function baseInfo(nextBranch = NEXT_BRANCH): Record<string, unknown> {
  return {
    chain: 'test', blocks: 106, bestblockhash: TIP,
    consensus: {chaintip: OLD_BRANCH, nextblock: nextBranch},
  };
}
function baseState(nextBranch = NEXT_BRANCH): SourceState {
  return {
    genesis: GENESIS,
    info: baseInfo(nextBranch),
    txout: {
      bestblock: TIP, confirmations: 1, value: '1.00000000',
      scriptPubKey: {hex: withdrawal.prevout.script_pubkey_hex},
      version: 5, coinbase: false,
    },
    blockHash: TIP,
    transaction: {...structuredClone(previousTransaction), confirmations: 1, in_active_chain: true},
  };
}
function controlledSource(
  change: (state: SourceState) => void = () => undefined,
  effects: string[] = [],
  nextBranch = NEXT_BRANCH,
): {source: ZcashEvidenceSource; state: SourceState} {
  const state = baseState(nextBranch);
  change(state);
  let infoCalls = 0;
  const response = async (label: string, value: unknown): Promise<unknown> => {
    effects.push(label);
    if (value instanceof Error) throw value;
    return structuredClone(value);
  };
  return {
    state,
    source: {
      getGenesisHash: () => response('source:getGenesisHash', state.genesis),
      getBlockchainInfo: () => response(
        'source:getBlockchainInfo',
        infoCalls++ === 0 || state.infoAfter === undefined ? state.info : state.infoAfter,
      ),
      getTxOut: (txid, index) => response('source:getTxOut:' + txid + ':' + index, state.txout),
      getBlockHash: height => response('source:getBlockHash:' + height, state.blockHash),
      getTransaction: (txid, blockHash) =>
        response('source:getTransaction:' + txid + ':' + blockHash, state.transaction),
    },
  };
}
function evidenceError(code: string): (error: unknown) => boolean {
  return error => error instanceof ZcashPaymentEvidenceError && error.code === code &&
    error.message === 'Zcash payment evidence ' + code + ' failure';
}
function changedInspector(change: (value: NativeInspection) => void, effects?: string[]): NativeInspectionProvider {
  return {
    inspect(raw, branch) {
      effects?.push('native:inspect');
      const value = structuredClone(inspector.inspect(raw, branch));
      change(value);
      return value;
    },
  };
}
function verifier(
  source: ZcashEvidenceSource,
  sourcePolicy = policy(),
  nativeInspector: NativeInspectionProvider = inspector,
): ZcashPaymentEvidence {
  return new ZcashPaymentEvidence(source, nativeInspector, sourcePolicy);
}

test('decimal ZEC lexemes preserve one zatoshi and the maximum supply exactly', () => {
  assert.equal(decimalZecToZatoshis('0.00000001'), 1n);
  assert.equal(decimalZecToZatoshis('1e-8'), 1n);
  assert.equal(decimalZecToZatoshis('21000000'), 2_100_000_000_000_000n);
  assert.equal(decimalZecToZatoshis('2.100000000000000e7'), 2_100_000_000_000_000n);
  for (const value of ['0.000000001', '21000000.00000001', '-0.00000001', '+1', 'NaN', 1]) {
    assert.throws(() => decimalZecToZatoshis(value), ZcashPaymentEvidenceError);
  }
});

test('one coherent source observation joins the new candidate branch to the old prevout branch', async () => {
  const effects: string[] = [];
  const receipt = await verifier(controlledSource(undefined, effects).source).check(currentCandidate);
  assert.deepEqual(receipt, {
    kind: 'consistent-source-observation', sourceId: 'controlled-zebra', network: 'regtest',
    genesisHash: GENESIS,
    candidateSha256: createHash('sha256').update(currentCandidate.toJson()).digest('hex'),
    tipHash: TIP, tipHeight: 106, candidateBranchId: NEXT_BRANCH, previousBranchId: OLD_BRANCH,
    previousBlockHash: TIP, previousHeight: 106, confirmations: 1,
    outpoint: withdrawal.prevout.txid + ':0', amountZat: '100000000',
    scriptPubKeyHex: withdrawal.prevout.script_pubkey_hex,
  });
  assert.equal(currentCandidate.getDigest().actual_fee_zat, 10_000);
  assert.deepEqual(effects, [
    'source:getGenesisHash', 'source:getBlockchainInfo',
    'source:getTxOut:' + withdrawal.prevout.txid + ':0', 'source:getBlockHash:106',
    'source:getTransaction:' + withdrawal.prevout.txid + ':' + TIP,
    'source:getGenesisHash', 'source:getBlockchainInfo',
  ]);
});

test('context, availability, confirmation, coinbase, amount, and script fail independently', async t => {
  const cases: Array<[string, string, (state: SourceState) => void]> = [
    ['genesis', 'genesis', state => { state.genesis = OTHER_HASH; }],
    ['network', 'network', state => { (state.info as Record<string, unknown>).chain = 'main'; }],
    ['tip branch', 'branch', state => { ((state.info as Record<string, unknown>).consensus as Record<string, unknown>).chaintip = NEXT_BRANCH; }],
    ['next branch', 'branch', state => { ((state.info as Record<string, unknown>).consensus as Record<string, unknown>).nextblock = OLD_BRANCH; }],
    ['null prevout', 'unavailable_prevout', state => { state.txout = null; }],
    ['tip hash', 'tip', state => { (state.txout as Record<string, unknown>).bestblock = OTHER_HASH; }],
    ['insufficient confirmations', 'insufficient_confirmations', state => {
      (state.txout as Record<string, unknown>).confirmations = 0;
    }],
    ['impossible confirmations', 'confirmations', state => {
      (state.txout as Record<string, unknown>).confirmations = 108;
    }],
    ['coinbase', 'unsupported_coinbase', state => { (state.txout as Record<string, unknown>).coinbase = true; }],
    ['typed coinbase', 'shape', state => { (state.txout as Record<string, unknown>).coinbase = 0; }],
    ['amount', 'utxo_join', state => { (state.txout as Record<string, unknown>).value = '0.99999999'; }],
    ['script', 'utxo_join', state => {
      ((state.txout as Record<string, unknown>).scriptPubKey as Record<string, unknown>).hex =
        '76a914' + '00'.repeat(20) + '88ac';
    }],
  ];
  for (const [name, code, change] of cases) {
    await t.test(name, async () => {
      await assert.rejects(
        verifier(controlledSource(change).source).check(currentCandidate),
        evidenceError(code),
      );
    });
  }
});

test('an impossible confirmation count cannot be masked by the minimum confirmation policy', async () => {
  const strictPolicy = {...policy(), minimumConfirmations: 110};
  const f = controlledSource(state => {
    (state.txout as Record<string, unknown>).confirmations = 109;
  });
  await assert.rejects(verifier(f.source, strictPolicy).check(currentCandidate), evidenceError('confirmations'));
});

test('block transaction identity, raw bytes, and selected RPC vout are all joined', async t => {
  const otherRaw = delivered.transactions.find(tx => tx.txid !== withdrawal.prevout.txid)?.hex;
  assert.equal(typeof otherRaw, 'string');
  const cases: Array<[string, string, (state: SourceState) => void]> = [
    ['active chain', 'previous_context', state => { (state.transaction as Record<string, unknown>).in_active_chain = false; }],
    ['txid', 'previous_context', state => { (state.transaction as Record<string, unknown>).txid = OTHER_HASH; }],
    ['block hash', 'previous_context', state => { (state.transaction as Record<string, unknown>).blockhash = OTHER_HASH; }],
    ['height', 'previous_context', state => { (state.transaction as Record<string, unknown>).height = 105; }],
    ['confirmations', 'previous_context', state => { (state.transaction as Record<string, unknown>).confirmations = 2; }],
    ['raw identity', 'native_identity', state => {
      (state.transaction as Record<string, unknown>).hex = otherRaw;
      (state.transaction as Record<string, unknown>).size = (otherRaw as string).length / 2;
    }],
    ['raw size', 'raw_size', state => { (state.transaction as Record<string, unknown>).size = 1; }],
    ['vout count', 'previous_outputs', state => {
      (state.transaction as Record<string, unknown>).vout =
        ((state.transaction as Record<string, unknown>).vout as unknown[]).slice(0, 2);
    }],
    ['vout index', 'previous_output', state => {
      (((state.transaction as Record<string, unknown>).vout as unknown[])[0] as Record<string, unknown>).n = 1;
    }],
    ['vout value', 'previous_output', state => {
      (((state.transaction as Record<string, unknown>).vout as unknown[])[0] as Record<string, unknown>).valueZat = 99_999_999;
    }],
    ['vout script', 'previous_output', state => {
      ((((state.transaction as Record<string, unknown>).vout as unknown[])[0] as Record<string, unknown>)
        .scriptPubKey as Record<string, unknown>).hex = '76a914' + '00'.repeat(20) + '88ac';
    }],
  ];
  for (const [name, code, change] of cases) {
    await t.test(name, async () => {
      await assert.rejects(
        verifier(controlledSource(change).source).check(currentCandidate),
        evidenceError(code),
      );
    });
  }
});

test('native identity and selected output are not replaced by RPC metadata', async t => {
  const cases: Array<[string, string, (value: NativeInspection) => void]> = [
    ['txid', 'native_identity', value => { value.txid = OTHER_HASH; }],
    ['branch', 'native_identity', value => { value.consensus_branch_id = NEXT_BRANCH; }],
    ['version', 'native_identity', value => { value.version = {...value.version, kind: 'v4', number: 4}; }],
    ['transparent presence', 'native_identity', value => { value.transparent.present = false; }],
    ['coinbase', 'unsupported_coinbase', value => { value.coinbase = true; }],
    ['output index', 'native_output', value => { value.transparent.outputs[0]!.index = 1; }],
    ['output kind', 'native_output', value => { value.transparent.outputs[0]!.script_kind = 'scripthash'; }],
    ['output value', 'native_output', value => { value.transparent.outputs[0]!.value_zat += 1; }],
    ['output script', 'native_output', value => {
      value.transparent.outputs[0]!.script_pubkey_hex = '76a914' + '00'.repeat(20) + '88ac';
    }],
  ];
  for (const [name, code, mutation] of cases) {
    await t.test(name, async () => {
      await assert.rejects(
        verifier(controlledSource().source, policy(), changedInspector(mutation)).check(currentCandidate),
        evidenceError(code),
      );
    });
  }
});

test('selected P2PKH remains admissible for a controlled trusted mixed native DTO', async () => {
  const mixedInspector = changedInspector(value => {
    value.fully_transparent = false;
    value.shielded.present = true;
    value.shielded.sapling_outputs = 1;
  });
  const receipt = await verifier(controlledSource().source, policy(), mixedInspector).check(currentCandidate);
  assert.equal(receipt.outpoint, withdrawal.prevout.txid + ':0');
});

test('native and source operational errors defer rather than becoming unavailable', async () => {
  const sourceFailure = controlledSource(state => { state.txout = new Error('RPC failure'); }).source;
  await assert.rejects(verifier(sourceFailure).check(currentCandidate), evidenceError('source'));
  const nativeFailure = new Error('native failure');
  const nativeInspector: NativeInspectionProvider = {inspect: () => { throw nativeFailure; }};
  await assert.rejects(
    verifier(controlledSource().source, policy(), nativeInspector).check(currentCandidate),
    error => error === nativeFailure,
  );
  const malformed = controlledSource(state => {
    (state.transaction as Record<string, unknown>).hex = '00';
    (state.transaction as Record<string, unknown>).size = 1;
  }).source;
  await assert.rejects(verifier(malformed).check(currentCandidate), NativeInspectionError);
});

test('candidate policy binds lock fields, fee, expiry window, and next-block branch', async t => {
  const cases: Array<[string, string, ZcashPaymentIntent, ZcashSourcePolicy]> = [
    ['old branch', 'candidate_branch', historicalIntent, policy()],
    ['lock time', 'lock_policy', paymentIntent({lockTime: 1}), policy()],
    ['sequence', 'lock_policy', paymentIntent({sequence: 0xffff_fffd}), policy()],
    ['fee', 'fee_policy', paymentIntent({feeZat: 5_000n}), policy()],
    ['expiry at tip', 'expiry_policy', paymentIntent({expiryHeight: 106}), policy()],
    ['expiry above delta', 'expiry_policy', paymentIntent({expiryHeight: 307}), policy()],
    ['consensus expiry ceiling', 'expiry_policy', paymentIntent({expiryHeight: 500_000_000}), policy(true, 500_000_000)],
  ];
  for (const [name, code, intent, sourcePolicy] of cases) {
    await t.test(name, async () => {
      const candidate = ZcashTransaction.create(intent, payment, inspector);
      await assert.rejects(
        verifier(controlledSource().source, sourcePolicy).check(candidate),
        evidenceError(code),
      );
    });
  }
  const boundaryIntent = paymentIntent({expiryHeight: 499_999_999});
  const boundaryCandidate = ZcashTransaction.create(boundaryIntent, payment, inspector);
  await verifier(controlledSource().source, policy(true, 500_000_000)).check(boundaryCandidate);
});

test('a coherent but changed second context invalidates the non-atomic observation', async () => {
  const controlled = controlledSource(state => {
    state.infoAfter = {
      chain: 'test', blocks: 107, bestblockhash: OTHER_HASH,
      consensus: {chaintip: NEXT_BRANCH, nextblock: NEXT_BRANCH},
    };
  });
  await assert.rejects(verifier(controlled.source).check(currentCandidate), evidenceError('context_changed'));
});

function historicalHarness(effects: string[] = []) {
  const controlled = controlledSource(undefined, effects, OLD_BRANCH);
  const recordingInspector: NativeInspectionProvider = {
    inspect(raw, branch) {
      effects.push('native:inspect');
      return inspector.inspect(raw, branch);
    },
  };
  return {
    ...controlled,
    recordingInspector,
    evidence: verifier(controlled.source, policy(false), recordingInspector),
  };
}
function fixtureMediator(action: (digest: Uint8Array) => Promise<void> | void): EcdsaSignMediator {
  return {
    isInSign: async () => false,
    sign: async digest => {
      await action(digest);
      return {signature: signature.signature, signatureRecovery: signature.signatureRecovery};
    },
  };
}

test('source check runs after native validation and immediately before the historical fixture mediator', async () => {
  const effects: string[] = [];
  const harness = historicalHarness(effects);
  let calls = 0;
  const mediator = fixtureMediator(digest => {
    calls++;
    effects.push('mediator:sign');
    assert.equal(Buffer.from(digest).toString('hex'), signature.digest);
    assert.equal(effects.at(-2), 'source:getBlockchainInfo');
  });
  const signer = new SourceCheckedZcashSigner(
    harness.evidence, payment, harness.recordingInspector, mediator, signature.publicKey,
  );
  const signed = await signer.sign(historicalCandidate, historicalIntent);
  assert.equal(calls, 1);
  assert.ok(effects.indexOf('native:inspect') < effects.lastIndexOf('source:getBlockchainInfo'));
  assert.notEqual(signed.getSignedHex(), undefined);
});

test('re-probe refusal for a vanished prevout or RPC failure invokes no mediator', async t => {
  for (const [name, unavailable, code] of [
    ['vanished', null, 'unavailable_prevout'],
    ['operational failure', new Error('controlled outage'), 'source'],
  ] as const) {
    await t.test(name, async () => {
      const controlled = controlledSource();
      const evidence = verifier(controlled.source);
      await evidence.check(currentCandidate);
      controlled.state.txout = unavailable;
      let calls = 0;
      const signer = new SourceCheckedZcashSigner(
        evidence, payment, inspector, fixtureMediator(() => { calls++; }), signature.publicKey,
      );
      await assert.rejects(signer.sign(currentCandidate, currentIntent), evidenceError(code));
      assert.equal(calls, 0);
    });
  }
});

test('identical requests coalesce and caller intent mutation during mediator await cannot change the snapshot', async () => {
  const harness = historicalHarness();
  let calls = 0;
  let entered!: () => void;
  let release!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const releasePromise = new Promise<void>(resolve => { release = resolve; });
  const mediator = fixtureMediator(async () => {
    calls++;
    entered();
    await releasePromise;
  });
  const signer = new SourceCheckedZcashSigner(
    harness.evidence, payment, harness.recordingInspector, mediator, signature.publicKey,
  );
  const callerIntent = paymentIntent({branchId: OLD_BRANCH});
  const first = signer.sign(historicalCandidate, callerIntent);
  const second = signer.sign(historicalCandidate, paymentIntent({branchId: OLD_BRANCH}));
  assert.strictEqual(first, second);
  await enteredPromise;
  callerIntent.eventId = '22'.repeat(32);
  callerIntent.input.amountZat = 1n;
  callerIntent.payments[0]!.assets.nativeToken = 1n;
  release();
  const signed = await first;
  assert.equal(calls, 1);
  assert.equal(signed.eventId, historicalIntent.eventId);
  assert.deepEqual(signed.getIntent(), historicalIntent);
});

test('an already-signed historical outcome survives later uncertainty without another probe or signature', async () => {
  const firstHarness = historicalHarness();
  const firstSigner = new SourceCheckedZcashSigner(
    firstHarness.evidence, payment, firstHarness.recordingInspector,
    fixtureMediator(() => undefined), signature.publicKey,
  );
  const signed = await firstSigner.sign(historicalCandidate, historicalIntent);
  const effects: string[] = [];
  const uncertain = controlledSource(state => { state.genesis = new Error('later uncertainty'); }, effects, OLD_BRANCH);
  let mediatorCalls = 0;
  const laterSigner = new SourceCheckedZcashSigner(
    verifier(uncertain.source, policy(false)), payment, inspector,
    fixtureMediator(() => { mediatorCalls++; }), signature.publicKey,
  );
  const preserved = await laterSigner.sign(signed, historicalIntent);
  assert.equal(preserved.toJson(), signed.toJson());
  assert.equal(mediatorCalls, 0);
  assert.deepEqual(effects, []);
});

test('per-call dispatch gate is awaited after evidence and directly before the bound mediator', {timeout: 15_000}, async () => {
  const effects: string[] = [];
  const harness = historicalHarness(effects);
  let entered!: () => void;
  let release!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const releasePromise = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  let approvedDigest: string | undefined;
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(digest => {
      calls++;
      assert.equal(effects.at(-1), 'gate:complete');
      assert.equal(Buffer.from(digest).toString('hex'), approvedDigest);
    }), signature.publicKey);
  const pending = signer.sign(historicalCandidate, historicalIntent, async observation => {
    assert.equal(effects.at(-1), 'source:getBlockchainInfo');
    assert.equal(observation.sighashAll, signature.digest);
    assert.equal(observation.evidenceReceipt.candidateSha256,
      createHash('sha256').update(historicalCandidate.toJson()).digest('hex'));
    assert.equal(observation.evidenceReceipt.outpoint,
      historicalIntent.input.txid + ':' + historicalIntent.input.index);
    assert.ok(Object.isFrozen(observation));
    assert.ok(Object.isFrozen(observation.evidenceReceipt));
    approvedDigest = observation.sighashAll;
    entered();
    await releasePromise;
    effects.push('gate:complete');
  });
  await enteredPromise;
  assert.equal(calls, 0);
  release();
  const signed = await pending;
  assert.equal(calls, 1);
  assert.notEqual(signed.getSignedHex(), undefined);
});

test('per-call dispatch refusal propagates without sending a digest', async () => {
  const harness = historicalHarness();
  let calls = 0;
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(() => { calls++; }), signature.publicKey);
  await assert.rejects(signer.sign(historicalCandidate, historicalIntent, async () => {
    throw new Error('attempt is no longer current');
  }), /attempt is no longer current/);
  assert.equal(calls, 0);
});

test('per-call refusal does not poison a later independently accepted call', async () => {
  const harness = historicalHarness();
  let calls = 0, gates = 0;
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(() => { calls++; }), signature.publicKey);
  await assert.rejects(signer.sign(historicalCandidate, historicalIntent, async () => {
    gates++; throw new Error('first attempt denied');
  }), /first attempt denied/);
  const signed = await signer.sign(historicalCandidate, historicalIntent, async () => {gates++;});
  assert.deepEqual({calls, gates}, {calls: 1, gates: 2});
  assert.notEqual(signed.getSignedHex(), undefined);
});

test('per-call gates for identical proposals cannot inherit another callers authorization', async () => {
  const harness = historicalHarness();
  let accepted = 0, rejected = 0, calls = 0;
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(() => { calls++; }), signature.publicKey);
  const first = signer.sign(historicalCandidate, historicalIntent, async () => { accepted++; });
  const second = signer.sign(historicalCandidate, historicalIntent, async () => {
    rejected++; throw new Error('second attempt denied');
  });
  assert.notEqual(first, second);
  const results = await Promise.allSettled([first, second]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.deepEqual({accepted, rejected, calls}, {accepted: 1, rejected: 1, calls: 1});
});

test('per-call gate cannot reuse a pending legacy request without checking its own permission', {timeout: 15_000}, async () => {
  const harness = historicalHarness();
  let entered!: () => void, release!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const releasePromise = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(async () => {calls++; entered(); await releasePromise;}), signature.publicKey);
  const legacy = signer.sign(historicalCandidate, historicalIntent);
  await enteredPromise;
  const guarded = signer.sign(historicalCandidate, historicalIntent, async () => {throw new Error('denied');});
  try {
    await assert.rejects(guarded, /denied/);
  } finally { release(); }
  await legacy;
  assert.equal(calls, 1);
});

test('per-call gate is not entered when source evidence fails', async () => {
  const harness = historicalHarness();
  harness.state.txout = null;
  let calls = 0, gates = 0;
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(() => { calls++; }), signature.publicKey);
  await assert.rejects(signer.sign(historicalCandidate, historicalIntent, async () => {gates++;}),
    evidenceError('unavailable_prevout'));
  assert.deepEqual({calls, gates}, {calls: 0, gates: 0});
});

test('per-call dispatch gate rejects malformed callbacks synchronously', () => {
  const harness = historicalHarness();
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(() => undefined), signature.publicKey);
  assert.throws(() => signer.sign(historicalCandidate, historicalIntent,
    {} as () => Promise<void>), /dispatch gate/);
});

test('per-call dispatch gate cannot change the native-validated proposal snapshot', async () => {
  const harness = historicalHarness();
  const intent = paymentIntent({branchId: OLD_BRANCH});
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(digest => assert.equal(Buffer.from(digest).toString('hex'), signature.digest)), signature.publicKey);
  const signed = await signer.sign(historicalCandidate, intent, async () => {
    intent.eventId = 'ff'.repeat(32);
    intent.payments[0].assets.nativeToken = 1n;
  });
  assert.deepEqual(signed.getIntent(), historicalIntent);
});

test('per-call gate authorizes dispatch only; preserving an existing outcome does not dispatch', async () => {
  const harness = historicalHarness();
  const signer = new SourceCheckedZcashSigner(harness.evidence, payment, inspector,
    fixtureMediator(() => undefined), signature.publicKey);
  const signed = await signer.sign(historicalCandidate, historicalIntent);
  let gates = 0;
  const retained = await signer.sign(signed, historicalIntent, async () => { gates++; });
  assert.equal(gates, 0);
  assert.equal(retained.toJson(), signed.toJson());
});
