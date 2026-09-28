import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {TransactionType, type EcdsaSignMediator} from '@rosen-chains/abstract-chain';
import {NativeZcashInspector} from '@rosen-bridge/rosen-extractor';
import {
  NativePaymentClient, SourceCheckedZcashSigner, ZcashPaymentEvidence,
  ZcashPaymentEvidenceError, ZcashTransaction,
  type ZcashEvidenceSource, type ZcashPaymentIntent, type ZcashSourcePolicy,
} from '../lib/index.js';

function environment(name: string): string {
  const value = process.env[name];
  assert.ok(value, `${name} is required for native lifecycle tests`);
  return value;
}
function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL('fixtures/' + name, import.meta.url), 'utf8')) as T;
}
const withdrawal = fixture<{
  expected_branch_id: string; expiry_height: number; amount_zat: string; fee_zat: string;
  prevout: {txid: string; vout: number; amount_zat: string; script_pubkey_hex: string};
}>('withdrawal-input.json');
const signature = fixture<{digest: string; publicKey: string; signature: string; signatureRecovery: string}>('tss-signature.json');
const finalized = fixture<{signed_tx_hex: string}>('withdrawal-finalized.json');
const block = fixture<{block: {hash: string; height: number}; transactions: Array<Record<string, unknown>>}>('payment-evidence-block-106.json');
const previous = block.transactions.find(value => value.txid === withdrawal.prevout.txid);
assert.ok(previous);
const native = new NativePaymentClient({executablePath: environment('ZCASH_PAYMENT_BIN'), expectedSha256: environment('ZCASH_PAYMENT_SHA256')});
const inspector = new NativeZcashInspector({executablePath: environment('ZCASH_INSPECTOR_BIN'), expectedSha256: environment('ZCASH_INSPECTOR_SHA256')});
const GENESIS = '029f11d80ef9765602235e1bc9727e3eb6ba20839319f761fee920d63401e327';

function approvedIntent(): ZcashPaymentIntent {
  return {
    network: 'regtest', eventId: '11'.repeat(32), txType: TransactionType.payment,
    reserveAddress: 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt', branchId: withdrawal.expected_branch_id,
    lockTime: 0, expiryHeight: withdrawal.expiry_height, sequence: 0xffff_fffe,
    input: {txid: withdrawal.prevout.txid, index: withdrawal.prevout.vout,
      amountZat: BigInt(withdrawal.prevout.amount_zat), scriptPubKeyHex: withdrawal.prevout.script_pubkey_hex},
    payments: [{address: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs', assets: {nativeToken: BigInt(withdrawal.amount_zat), tokens: []}}],
    feeZat: BigInt(withdrawal.fee_zat),
  };
}
function policy(): ZcashSourcePolicy {
  return {network: 'regtest', genesisHash: GENESIS, sourceId: 'lifecycle-fixture',
    branches: [{height: 0, branchId: withdrawal.expected_branch_id}],
    minimumConfirmations: 1, maximumExpiryDelta: 200};
}
function source(getGenesisHash: () => Promise<unknown> = async () => GENESIS): ZcashEvidenceSource {
  return {
    getGenesisHash,
    getBlockchainInfo: async () => ({chain: 'test', blocks: block.block.height, bestblockhash: block.block.hash,
      consensus: {chaintip: withdrawal.expected_branch_id, nextblock: withdrawal.expected_branch_id}}),
    getTxOut: async (txid, index) => {
      assert.equal(txid, withdrawal.prevout.txid); assert.equal(index, withdrawal.prevout.vout);
      return {bestblock: block.block.hash, confirmations: 1, coinbase: false, version: 5,
        value: '1.00000000', scriptPubKey: {hex: withdrawal.prevout.script_pubkey_hex}};
    },
    getBlockHash: async height => { assert.equal(height, block.block.height); return block.block.hash; },
    getTransaction: async (txid, blockHash) => {
      assert.equal(txid, withdrawal.prevout.txid); assert.equal(blockHash, block.block.hash);
      return {...structuredClone(previous), confirmations: 1, in_active_chain: true};
    },
  };
}
function mediator(onSign: () => void): EcdsaSignMediator {
  return {isInSign: async () => false, sign: async digest => {
    onSign();
    assert.equal(Buffer.from(digest).toString('hex'), signature.digest);
    return {signature: signature.signature, signatureRecovery: signature.signatureRecovery};
  }};
}

test('the same source-checked signer retries a failed probe and signs exactly once after recovery', async () => {
  let available = false;
  const evidence = new ZcashPaymentEvidence(source(async () => {
    if (!available) throw new Error('controlled source outage');
    return GENESIS;
  }), inspector, policy());
  let signCalls = 0;
  const signer = new SourceCheckedZcashSigner(evidence, native, inspector, mediator(() => { signCalls++; }), signature.publicKey);
  const intent = approvedIntent();
  const candidate = ZcashTransaction.create(intent, native, inspector);
  await assert.rejects(signer.sign(candidate, intent), error =>
    error instanceof ZcashPaymentEvidenceError && error.code === 'source');
  assert.equal(signCalls, 0);
  available = true;
  const signed = await signer.sign(candidate, intent);
  assert.equal(signCalls, 1);
  assert.equal(signed.getSignedHex(), finalized.signed_tx_hex);
  assert.equal(candidate.getSignedHex(), undefined);
});

test('policy values and bound source callbacks survive mutation during the first source await', async () => {
  let entered!: () => void;
  let release!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const releasePromise = new Promise<void>(resolve => { release = resolve; });
  let genesisCalls = 0;
  const callerSource = source(async () => {
    genesisCalls++;
    if (genesisCalls === 1) { entered(); await releasePromise; }
    return GENESIS;
  });
  const callerPolicy = policy();
  const evidence = new ZcashPaymentEvidence(callerSource, inspector, callerPolicy);
  const intent = approvedIntent();
  const candidate = ZcashTransaction.create(intent, native, inspector);
  const pending = evidence.check(candidate);
  await enteredPromise;
  callerPolicy.network = 'mainnet';
  callerPolicy.genesisHash = '00'.repeat(32);
  callerPolicy.sourceId = 'mutated-source';
  callerPolicy.minimumConfirmations = 999;
  callerPolicy.maximumExpiryDelta = 1;
  callerPolicy.branches[0].branchId = 'c8e71055';
  callerPolicy.branches[0].height = 50;
  let replacementsCalled = 0;
  for (const method of ['getGenesisHash', 'getBlockchainInfo', 'getTxOut', 'getBlockHash', 'getTransaction'] as const) {
    callerSource[method] = async () => { replacementsCalled++; throw new Error('replacement callback'); };
  }
  release();
  const receipt = await pending;
  assert.equal(replacementsCalled, 0);
  assert.equal(genesisCalls, 2);
  assert.equal(receipt.network, 'regtest');
  assert.equal(receipt.genesisHash, GENESIS);
  assert.equal(receipt.sourceId, 'lifecycle-fixture');
  assert.equal(receipt.previousBranchId, withdrawal.expected_branch_id);
  assert.equal(receipt.candidateBranchId, withdrawal.expected_branch_id);
  assert.equal(receipt.confirmations, 1);
  assert.equal(receipt.outpoint, withdrawal.prevout.txid + ':' + withdrawal.prevout.vout);
});
