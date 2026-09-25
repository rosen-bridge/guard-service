import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SigningStatus,
  TransactionType,
  type ChainConfigs,
  type PaymentOrder,
} from '@rosen-chains/abstract-chain';
import { TokenMap, type RosenTokens } from '@rosen-bridge/tokens';
import { NativeZcashInspector } from '@rosen-bridge/rosen-extractor';
import { ZcashGuardEvidenceError } from '@rosen-chains/zcash-event';
import {
  NativePaymentClient,
  ZcashPaymentEvidenceError,
  ZcashTransaction,
} from '@rosen-chains/zcash-payment';

import {
  ZcashChain,
  ZcashChainError,
  type ZcashChainOptions,
} from '../lib/zcashChain.js';
import {
  ZcashNetworkError,
  type ZcashChainSource,
} from '../lib/zcashNetwork.js';

const fixture = (name: string): any =>
  JSON.parse(
    readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8'),
  );
const paymentFixture = (name: string): any =>
  JSON.parse(
    readFileSync(
      new URL(`../../zcash-payment/tests/fixtures/${name}`, import.meta.url),
      'utf8',
    ),
  );
function required(name: string): string {
  const value = process.env[name];
  assert.ok(value, `${name} is required`);
  return value;
}

const live = fixture('payment-planner-live-evidence.json');
const withdrawal = paymentFixture('withdrawal-input.json');
const signature = paymentFixture('tss-signature.json');
const paymentBlock = paymentFixture('payment-evidence-block-106.json');
const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const payout = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const eventId = '33'.repeat(32);
const [previousTxId, previousIndexText] = live.positive.outpoint.split(':');
const previousIndex = Number(previousIndexText);
const native = new NativePaymentClient({
  executablePath: required('ZCASH_PAYMENT_BIN'),
  expectedSha256: required('ZCASH_PAYMENT_SHA256'),
});
const inspector = new NativeZcashInspector({
  executablePath: required('ZCASH_INSPECTOR_BIN'),
  expectedSha256: required('ZCASH_INSPECTOR_SHA256'),
});

const tokenConfig = (): RosenTokens => [
  {
    zcash: {
      tokenId: 'zec', name: 'ZEC', decimals: 8,
      type: 'native', residency: 'native', extra: {},
    },
    ergo: {
      tokenId: 'ab'.repeat(32), name: 'rsZEC', decimals: 8,
      type: 'token', residency: 'wrapped', extra: {},
    },
  },
];
const configs = (): ChainConfigs => ({
  fee: 10_000n,
  confirmations: { observation: 1, payment: 1, cold: 1, manual: 1, arbitrary: 1 },
  addresses: { lock: reserve, cold: reserve, permit: reserve, fraud: reserve },
  rwtId: 'cd'.repeat(32),
});
const order = (): PaymentOrder => [
  { address: payout, assets: { nativeToken: 10_000_000n, tokens: [] } },
];

interface SourceState {
  txout: unknown;
  failTxout: boolean;
  unbound: unknown;
  block: unknown;
  mempool: unknown;
  transaction: unknown;
  blockHashes: Record<string, string>;
  submitResult: unknown;
  submittedHex?: string;
  calls: string[];
}

async function setup(lockAddress = reserve, feeFloorZat = 10_000n): Promise<{
  chain: ZcashChain;
  state: SourceState;
  callerConfigs: ChainConfigs;
}> {
  const tokens = new TokenMap();
  await tokens.updateConfigByJson(tokenConfig());
  const observation = (method: string): unknown => {
    const entry = live.observations.find((item: any) => item.method === method);
    assert.ok(entry, `missing ${method}`);
    return structuredClone(entry.result);
  };
  const state: SourceState = {
    txout: observation('getTxOut'),
    failTxout: false,
    unbound: null,
    block: null,
    mempool: {},
    transaction: observation('getTransaction'),
    blockHashes: {[String(live.positive.tipHeight)]: live.positive.tipHash},
    submitResult: null,
    calls: [],
  };
  const read = async (name: string, value: unknown): Promise<unknown> => {
    state.calls.push(name);
    return structuredClone(value);
  };
  const source: ZcashChainSource = {
    async getGenesisHash() { return read('genesis', observation('getGenesisHash')); },
    async getBlockchainInfo() { return read('info', observation('getBlockchainInfo')); },
    async getAddressUtxos() {
      return {
        utxos: [{
          address: reserve,
          txid: previousTxId,
          outputIndex: previousIndex,
          script: live.positive.scriptPubKeyHex,
          satoshis: Number(live.positive.amountZat),
          height: live.positive.previousHeight,
        }],
        hash: live.positive.tipHash,
        height: live.positive.tipHeight,
      };
    },
    async getTxOut() {
      state.calls.push('txout');
      if (state.failTxout) throw new Error('transport unavailable');
      return structuredClone(state.txout);
    },
    async getBlockHash(height) {
      state.calls.push(`blockhash:${height}`);
      return state.blockHashes[String(height)] ?? observation('getBlockHash');
    },
    async getTransaction() { return read('transaction', state.transaction); },
    async getBlock(blockHash) { return read(`block:${blockHash}`, state.block); },
    async getUnboundTransaction(txid) { return read(`unbound:${txid}`, state.unbound); },
    async getMempoolEntries() { return read('mempool', state.mempool); },
    async sendRawTransaction(raw) {
      state.calls.push('submit');
      state.submittedHex = raw;
      return structuredClone(state.submitResult);
    },
  };
  const callerConfigs = configs();
  callerConfigs.addresses.lock = lockAddress;
  const options: ZcashChainOptions = {
    source,
    policy: structuredClone(live.policy),
    native,
    inspector,
    configs: callerConfigs,
    tokens,
    feeFloorZat,
    maximumFeeZat: 20_000n,
    expiryDelta: 200,
    minimumOutputZat: 1_000n,
  };
  return { chain: new ZcashChain(options), state, callerConfigs };
}

async function proposal(chain: ZcashChain): Promise<ZcashTransaction> {
  return await chain.generateTransaction(
    eventId,
    TransactionType.payment,
    order(),
    [],
    [],
  ) as ZcashTransaction;
}

function historicalSigned(): ZcashTransaction {
  return ZcashTransaction.create({
    network: 'regtest',
    eventId,
    txType: TransactionType.payment,
    reserveAddress: reserve,
    branchId: withdrawal.expected_branch_id,
    lockTime: 0,
    expiryHeight: withdrawal.expiry_height,
    sequence: 0xffff_fffe,
    input: {
      txid: withdrawal.prevout.txid,
      index: withdrawal.prevout.vout,
      amountZat: BigInt(withdrawal.prevout.amount_zat),
      scriptPubKeyHex: withdrawal.prevout.script_pubkey_hex,
    },
    payments: [{
      address: payout,
      assets: { nativeToken: BigInt(withdrawal.amount_zat), tokens: [] },
    }],
    feeZat: BigInt(withdrawal.fee_zat),
  }, native, inspector).finalize(
    signature.signature,
    signature.publicKey,
    native,
    inspector,
  );
}

function retainHistoricalPrevout(state: SourceState): void {
  const previous = paymentBlock.transactions.find(
    (transaction: Record<string, unknown>) => transaction.txid === withdrawal.prevout.txid,
  );
  assert.ok(previous);
  const previousBlockHash = paymentBlock.block.hash as string;
  state.txout = {
    bestblock: live.positive.tipHash,
    confirmations: 2,
    value: '1',
    scriptPubKey: {hex: withdrawal.prevout.script_pubkey_hex},
    version: 5,
    coinbase: false,
  };
  state.transaction = previous;
  state.blockHashes[String(paymentBlock.block.height)] = previousBlockHash;
}

test('concrete chain delegates native generation and preserves exact fee-inclusive assets', async () => {
  const { chain } = await setup();
  const transaction = await proposal(chain);
  assert.equal(transaction.getUnsignedHex(), live.unsignedTxHex);
  assert.deepEqual(await chain.getTransactionAssets(transaction), {
    inputAssets: { nativeToken: BigInt(live.positive.amountZat), tokens: [] },
    outputAssets: { nativeToken: BigInt(live.positive.amountZat), tokens: [] },
  });
  assert.equal(await chain.verifyTransactionFee(transaction), true);
  assert.equal(await chain.verifyNoTokenBurned(transaction), true);
  assert.equal(await chain.verifyPaymentTransaction(transaction), true);
  assert.equal(chain.getMinimumNativeToken(), 1_000n);
});

test('fee verification rejects an underquote, positive-change overpayment, and sub-minimum payment', async () => {
  const { chain } = await setup();
  const transaction = await proposal(chain);
  const intent = transaction.getIntent();
  const requiredFee = BigInt(transaction.getDigest().zip317_conventional_fee_zat);
  assert.ok(requiredFee > 0n && requiredFee < 20_000n);
  const make = (change: Partial<typeof intent>) =>
    ZcashTransaction.create({ ...intent, ...change }, native, inspector);
  assert.equal(
    await chain.verifyTransactionFee(make({ feeZat: requiredFee - 1n })),
    false,
  );
  assert.equal(
    await chain.verifyTransactionFee(make({ feeZat: requiredFee + 1n })),
    false,
  );
  assert.equal(
    await chain.verifyTransactionFee(make({
      payments: [{
        address: payout,
        assets: { nativeToken: 999n, tokens: [] },
      }],
    })),
    false,
  );
});

test('order extraction is decoded and detached, and signed status is enforced', async () => {
  const { chain } = await setup();
  const unsigned = await proposal(chain);
  const extracted = chain.extractTransactionOrder(unsigned);
  assert.deepEqual(extracted, order());
  extracted[0].assets.nativeToken = 1n;
  assert.deepEqual(chain.extractTransactionOrder(unsigned), order());
  assert.equal(
    chain.verifyTransactionExtraConditions(unsigned, SigningStatus.UnSigned),
    true,
  );
  assert.equal(
    chain.verifyTransactionExtraConditions(unsigned, SigningStatus.Signed),
    false,
  );
  const signed = historicalSigned();
  assert.equal(
    chain.verifyTransactionExtraConditions(signed, SigningStatus.Signed),
    true,
  );
});

test('model JSON and serialized model bytes round-trip while bare native hex is rejected', async () => {
  const { chain } = await setup();
  const transaction = await proposal(chain);
  assert.equal(
    (await chain.rawTxToPaymentTransaction(transaction.toJson())).toJson(),
    transaction.toJson(),
  );
  assert.equal(
    (await chain.rawTxToPaymentTransaction(
      Buffer.from(transaction.txBytes).toString('hex'),
    )).toJson(),
    transaction.toJson(),
  );
  await assert.rejects(
    chain.rawTxToPaymentTransaction(transaction.getUnsignedHex()),
  );
});

test('confirmed signed models remain structurally valid after spending while isTxValid keeps fresh evidence', async () => {
  const { chain, state } = await setup();
  const transaction = historicalSigned();
  state.txout = null;
  assert.equal(await chain.verifyPaymentTransaction(transaction), true);
  assert.deepEqual(await chain.isTxValid(transaction, SigningStatus.Signed), {
    isValid: false,
    details: { reason: 'unavailable_prevout', unexpected: false },
  });
  state.failTxout = true;
  assert.equal(await chain.verifyPaymentTransaction(transaction), true);
  await assert.rejects(
    chain.isTxValid(transaction, SigningStatus.Signed),
    (error) =>
      error instanceof ZcashPaymentEvidenceError && error.code === 'source',
  );
});

test('configuration is copied and guard-only signing/submission entry points fail closed', async () => {
  const { chain, callerConfigs } = await setup();
  callerConfigs.addresses.lock = payout;
  const retained = chain.getChainConfigs();
  assert.equal(retained.addresses.lock, reserve);
  assert.equal(Object.isFrozen(retained), true);
  assert.equal(Object.isFrozen(retained.addresses), true);
  const transaction = await proposal(chain);
  await assert.rejects(
    chain.signTransaction(transaction, 2),
    (error) => error instanceof ZcashChainError && error.code === 'signing_requires_guard_coordinator',
  );
  await assert.rejects(
    chain.isTransactionInSign(transaction),
    (error) => error instanceof ZcashChainError && error.code === 'signing_requires_guard_coordinator',
  );
});

test('chain broadcasts the exact canonical signed bytes and retains returned-txid checking', async () => {
  const { chain, state } = await setup();
  const transaction = historicalSigned();
  const signedHex = transaction.getSignedHex();
  assert.ok(signedHex);
  retainHistoricalPrevout(state);
  state.submitResult = transaction.txId;
  await chain.submitTransaction(transaction, {
    async authorize() { state.calls.push('authorize'); },
    assertCurrent() { state.calls.push('assertCurrent'); },
  });
  assert.equal(state.submittedHex, signedHex);
  const submitIndex = state.calls.indexOf('submit');
  assert.deepEqual(
    state.calls.slice(submitIndex - 2, submitIndex),
    ['authorize', 'assertCurrent'],
  );
  assert.equal(state.calls.includes('txout'), true);
  state.submitResult = '99'.repeat(32);
  await assert.rejects(
    chain.submitTransaction(transaction),
    (error) => error instanceof ZcashNetworkError && error.code === 'identity',
  );
  assert.equal(state.calls.filter((call) => call === 'txout').length, 2);
});

test('unsigned, tampered, and cross-context payments are refused before transport', async t => {
  const { chain, state } = await setup();
  const signed = historicalSigned();
  const unsigned = ZcashTransaction.create(signed.getIntent(), native, inspector);
  const signedJson = JSON.parse(signed.toJson()) as Record<string, any>;
  const payload = JSON.parse(
    Buffer.from(signedJson.txBytes as string, 'hex').toString('utf8'),
  ) as Record<string, any>;
  const originalSignedHex = payload.authorization.signedTxHex as string;
  payload.authorization.signedTxHex =
    (originalSignedHex.startsWith('00') ? '01' : '00') + originalSignedHex.slice(2);
  signedJson.txBytes = Buffer.from(JSON.stringify(payload), 'utf8').toString('hex');
  const tampered = new Proxy(signed, {
    get(target, property, receiver) {
      if (property === 'toJson') return () => JSON.stringify(signedJson);
      return Reflect.get(target, property, receiver);
    },
  });
  for (const [name, transaction] of [
    ['unsigned', unsigned],
    ['tampered', tampered],
  ] as const) {
    await t.test(name, async () => {
      state.calls.length = 0;
      await assert.rejects(chain.submitTransaction(transaction));
      assert.deepEqual(state.calls, []);
      await assert.rejects(chain.observeTransaction(transaction));
      assert.deepEqual(state.calls, []);
    });
  }
  await t.test('cross-context', async () => {
    const cross = await setup(payout);
    await assert.rejects(cross.chain.submitTransaction(signed));
    assert.deepEqual(cross.state.calls, []);
    await assert.rejects(cross.chain.observeTransaction(signed));
    assert.deepEqual(cross.state.calls, []);
  });
  await t.test('invalid-fee', async () => {
    const strictFee = await setup(reserve, 10_001n);
    await assert.rejects(strictFee.chain.submitTransaction(signed));
    assert.deepEqual(strictFee.state.calls, []);
    await assert.rejects(strictFee.chain.observeTransaction(signed));
    assert.deepEqual(strictFee.state.calls, []);
  });
});

test('submission requires fresh evidence before transport on every attempt', async () => {
  const { chain, state } = await setup();
  const transaction = historicalSigned();
  state.submitResult = transaction.txId;
  state.txout = null;
  await assert.rejects(
    chain.submitTransaction(transaction),
    (error) =>
      error instanceof ZcashPaymentEvidenceError &&
      error.code === 'unavailable_prevout',
  );
  assert.equal(state.calls.includes('submit'), false);
});

test('chain observes exact signed bytes as absent, mempool, and confirmed without prevout freshness', async () => {
  const { chain, state } = await setup();
  const transaction = historicalSigned();
  const signedHex = transaction.getSignedHex();
  assert.ok(signedHex);

  assert.deepEqual(await chain.observeTransaction(transaction), {kind: 'absent'});
  state.unbound = {
    txid: transaction.txId,
    hex: signedHex,
    size: signedHex.length / 2,
    in_active_chain: false,
  };
  state.mempool = {[transaction.txId]: {}};
  assert.deepEqual(await chain.observeTransaction(transaction), {
    kind: 'mempool', txId: transaction.txId, hex: signedHex,
  });

  const blockHash = live.positive.tipHash;
  state.unbound = {
    txid: transaction.txId,
    hex: signedHex,
    size: signedHex.length / 2,
    blockhash: blockHash,
    height: live.positive.tipHeight,
    confirmations: 1,
    in_active_chain: true,
  };
  state.block = {
    hash: blockHash,
    previousblockhash: '44'.repeat(32),
    height: live.positive.tipHeight,
    confirmations: 1,
    nTx: 1,
    tx: [transaction.txId],
  };
  assert.deepEqual(await chain.observeTransaction(transaction), {
    kind: 'confirmed',
    txId: transaction.txId,
    hex: signedHex,
    blockHash,
    height: live.positive.tipHeight,
    confirmations: 1,
  });
  state.txout = null;
  assert.equal(
    (await chain.observeTransaction(transaction)).kind,
    'confirmed',
    'observation must not require an already-spent prevout to remain unspent',
  );
  assert.equal(state.calls.includes('txout'), false);
});

test('confirmed lock transaction must retain block identity and membership', async () => {
  const { chain } = await setup();
  const txid = '11'.repeat(32);
  const blockhash = '22'.repeat(32);
  const transaction = { txid, blockhash, height: 7, hex: '00', size: 1 };
  const block = {
    hash: blockhash,
    parentHash: '33'.repeat(32),
    height: 7,
    transactionIds: [txid],
  };
  assert.equal(
    await chain.verifyLockTransactionExtraConditions(transaction, block),
    true,
  );
  await assert.rejects(
    chain.verifyLockTransactionExtraConditions(
      transaction,
      { ...block, transactionIds: [] } as any,
    ),
    ZcashGuardEvidenceError,
  );
});
