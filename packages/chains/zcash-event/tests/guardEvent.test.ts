import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

import {
  decodeErgoAddress,
  validateErgoAddress,
} from '@rosen-bridge/address-codec-ergo';
import { AddressManager } from '@rosen-bridge/address-manager';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import {
  NativeZcashInspector,
  type NativeInspectionProvider,
  type ZcashRpcRosenExtractorOptions,
  type ZcashRpcTransaction,
} from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import { NotFoundError } from '@rosen-chains/abstract-chain';
import type {
  AssetBalance,
  ChainConfigs,
  EventTrigger,
  PaymentOrder,
  PaymentTransaction,
  TokenDetail,
  TransactionAssetBalance,
  ValidityStatus,
} from '@rosen-chains/abstract-chain';

import {
  AbstractZcashEventChain,
  AbstractZcashGuardNetwork,
  ZcashGuardEvidenceError,
  ZcashGuardRosenExtractor,
  deserializeZcashTransaction,
  serializeZcashTransaction,
  type ZcashGuardEventSource,
} from '../lib/index.js';

interface DeliveredBlock {
  block: {
    hash: string;
    parentHash: string;
    height: number;
  };
  transactions: ZcashRpcTransaction[];
}

interface GuardBlock {
  hash: string;
  parentHash: string;
  height: number;
  transactionCount: number;
  transactionIds: string[];
}

const delivered = JSON.parse(
  readFileSync(
    new URL('./fixtures/zcash-block-106.json', import.meta.url),
    'utf8',
  ),
) as DeliveredBlock;
const deposit = delivered.transactions[1];
const guardBlock: GuardBlock = {
  hash: delivered.block.hash,
  parentHash: delivered.block.parentHash,
  height: delivered.block.height,
  transactionCount: delivered.transactions.length,
  transactionIds: delivered.transactions.map((transaction) => transaction.txid),
};
const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const targetToken = 'ab'.repeat(32);

const chainConfigs: ChainConfigs = {
  fee: 10_000n,
  confirmations: {
    observation: 1,
    payment: 1,
    cold: 1,
    manual: 1,
    arbitrary: 1,
  },
  addresses: { lock: reserve, cold: reserve, permit: reserve, fraud: reserve },
  rwtId: 'rwt',
};

const event: EventTrigger = {
  height: 500,
  fromChain: 'zcash',
  toChain: 'ergo',
  fromAddress:
    'box:f5ffc9c9d6fa6f4035a83debd4ed68421392dede37879d23f30ab00da7cda1e2.1',
  toAddress: '9iMjQx8PzwBKXRvsFUJFJAPoy31znfEeBUGz8DRkcnJX4rJYjVd',
  amount: '100000000',
  bridgeFee: '5000',
  networkFee: '2200',
  sourceChainTokenId: 'zec',
  targetChainTokenId: targetToken,
  sourceTxId: deposit.txid,
  sourceChainHeight: 106,
  sourceBlockId: guardBlock.hash,
  WIDsHash: 'cd'.repeat(32),
  WIDsCount: 3,
};

const permissiveFee = new ChainMinimumFee({
  bridgeFee: 0n,
  networkFee: 0n,
  feeRatio: 0n,
  rsnRatio: 0n,
  rsnRatioDivisor: 10_000n,
});

class MutableSource implements ZcashGuardEventSource {
  readonly blockRequests: string[] = [];
  readonly transactionRequests: Array<[string, string]> = [];
  blockResponses: unknown[];
  transactionResponse: unknown;
  blockError?: Error;
  transactionError?: Error;

  constructor(block: unknown = guardBlock, transaction: unknown = deposit) {
    this.blockResponses = [block];
    this.transactionResponse = transaction;
  }

  getBlock = async (blockId: string): Promise<unknown> => {
    this.blockRequests.push(blockId);
    if (this.blockError) throw this.blockError;
    const index = Math.min(
      this.blockRequests.length - 1,
      this.blockResponses.length - 1,
    );
    return structuredClone(this.blockResponses[index]);
  };

  getTransaction = async (txid: string, blockId: string): Promise<unknown> => {
    this.transactionRequests.push([txid, blockId]);
    if (this.transactionError) throw this.transactionError;
    return structuredClone(this.transactionResponse);
  };
}

class TestNetwork extends AbstractZcashGuardNetwork {
  private unreachable(): never {
    throw new Error('unused payment network method');
  }

  getHeight = async (): Promise<number> => this.unreachable();
  getTxConfirmation = async (): Promise<number> => this.unreachable();
  getAddressAssets = async (): Promise<AssetBalance> => this.unreachable();
  submitTransaction = async (): Promise<void> => this.unreachable();
  getMempoolTransactions = async (): Promise<ZcashRpcTransaction[]> =>
    this.unreachable();
  getTokenDetail = async (): Promise<TokenDetail> => this.unreachable();
  getActualTxId = async (): Promise<string> => this.unreachable();
}

class TestChain extends AbstractZcashEventChain {
  private unreachable(): never {
    throw new Error('unused payment chain method');
  }

  generateMultipleTransactions = async (): Promise<PaymentTransaction[]> =>
    this.unreachable();
  getTransactionAssets = async (): Promise<TransactionAssetBalance> =>
    this.unreachable();
  extractTransactionOrder = (): PaymentOrder => this.unreachable();
  verifyTransactionFee = async (): Promise<boolean> => this.unreachable();
  verifyTransactionExtraConditions = (): boolean => this.unreachable();
  isTxValid = async (): Promise<ValidityStatus> => this.unreachable();
  signTransaction = async (): Promise<PaymentTransaction> => this.unreachable();
  isTransactionInSign = async (): Promise<boolean> => this.unreachable();
  submitTransaction = async (): Promise<void> => this.unreachable();
  isTxInMempool = async (): Promise<boolean> => this.unreachable();
  getMinimumNativeToken = (): bigint => this.unreachable();
  PaymentTransactionFromJson = (): PaymentTransaction => this.unreachable();
  rawTxToPaymentTransaction = async (): Promise<PaymentTransaction> =>
    this.unreachable();
  verifyPaymentTransaction = async (): Promise<boolean> => this.unreachable();
}

async function loadTokens(): Promise<TokenMap> {
  const tokens = new TokenMap();
  await tokens.updateConfigByJson(
    JSON.parse(
      readFileSync(new URL('./fixtures/tokens.json', import.meta.url), 'utf8'),
    ),
  );
  return tokens;
}

function nativeInspector(): NativeZcashInspector {
  assert.ok(
    process.env.ZCASH_INSPECTOR_BIN && process.env.ZCASH_INSPECTOR_SHA256,
    'ZCASH_INSPECTOR_BIN and ZCASH_INSPECTOR_SHA256 are required',
  );
  return new NativeZcashInspector({
    executablePath: process.env.ZCASH_INSPECTOR_BIN,
    expectedSha256: process.env.ZCASH_INSPECTOR_SHA256,
  });
}

async function setup(
  source = new MutableSource(),
  inspector: NativeInspectionProvider = nativeInspector(),
  branchIdAtHeight: (height: number) => string = () => 'c2d6d0b4',
): Promise<{
  chain: TestChain;
  network: TestNetwork;
  options: ZcashRpcRosenExtractorOptions;
}> {
  AddressManager.init(
    { ergo: validateErgoAddress },
    { ergo: decodeErgoAddress },
  );
  const tokens = await loadTokens();
  const options: ZcashRpcRosenExtractorOptions = {
    network: 'regtest',
    lockAddress: reserve,
    tokens,
    inspector,
    branchIdAtHeight,
    storeRawData: true,
  };
  const network = new TestNetwork(source);
  return {
    chain: new TestChain(network, chainConfigs, options),
    network,
    options,
  };
}

function changeOrdinaryOutputByOneZatoshi(
  inspector: NativeInspectionProvider,
): ZcashRpcTransaction {
  const originalValue = Buffer.alloc(8);
  originalValue.writeBigUInt64LE(424_950_000n);
  const changedValue = Buffer.alloc(8);
  changedValue.writeBigUInt64LE(424_949_999n);
  const needle = originalValue.toString('hex');
  const offset = deposit.hex.indexOf(needle);
  assert.notEqual(offset, -1);
  assert.equal(deposit.hex.lastIndexOf(needle), offset);
  const hex =
    deposit.hex.slice(0, offset) +
    changedValue.toString('hex') +
    deposit.hex.slice(offset + needle.length);
  const inspection = inspector.inspect(hex, 'c2d6d0b4');
  return { ...deposit, hex, size: hex.length / 2, txid: inspection.txid };
}

test('canonical serializer is exact and rejects noncanonical or oversized envelopes', () => {
  const serialized = serializeZcashTransaction(deposit);
  assert.equal(
    serialized,
    JSON.stringify({
      txid: deposit.txid,
      hex: deposit.hex,
      size: deposit.size,
      blockhash: deposit.blockhash,
      height: deposit.height,
    }),
  );
  assert.deepEqual(deserializeZcashTransaction(serialized), {
    txid: deposit.txid,
    hex: deposit.hex,
    size: deposit.size,
    blockhash: deposit.blockhash,
    height: deposit.height,
  });

  const variants = [
    ` ${serialized}`,
    JSON.stringify({
      hex: deposit.hex,
      txid: deposit.txid,
      size: deposit.size,
      blockhash: deposit.blockhash,
      height: deposit.height,
    }),
    serialized.slice(0, -1) + ',"extra":true}',
    serialized.replace('{', `{"txid":"${deposit.txid}",`),
  ];
  for (const variant of variants) {
    assert.throws(
      () => deserializeZcashTransaction(variant),
      ZcashGuardEvidenceError,
    );
  }
  const invalidFields: unknown[] = [
    { ...deposit, txid: deposit.txid.toUpperCase() },
    { ...deposit, txid: '00' },
    { ...deposit, hex: deposit.hex.toUpperCase() },
    { ...deposit, hex: '0' },
    { ...deposit, size: deposit.size + 1 },
    { ...deposit, size: Number.MAX_SAFE_INTEGER + 1 },
    { ...deposit, blockhash: deposit.blockhash.toUpperCase() },
    { ...deposit, blockhash: '00' },
    { ...deposit, height: -1 },
    { ...deposit, height: Number.MAX_SAFE_INTEGER + 1 },
    { ...deposit, height: -0 },
  ];
  for (const invalid of invalidFields) {
    assert.throws(
      () => serializeZcashTransaction(invalid),
      ZcashGuardEvidenceError,
    );
  }
  assert.throws(
    () =>
      serializeZcashTransaction({
        ...deposit,
        hex: '00'.repeat(2_000_001),
        size: 2_000_001,
      }),
    ZcashGuardEvidenceError,
  );
});

test('inherited verifyEvent accepts the exact native-backed deposit and binds every request', async () => {
  const source = new MutableSource();
  const { chain } = await setup(source);
  assert.equal(await chain.verifyEvent(event, permissiveFee), true);
  assert.deepEqual(source.blockRequests, [
    event.sourceBlockId,
    event.sourceBlockId,
  ]);
  assert.deepEqual(source.transactionRequests, [
    [event.sourceTxId, event.sourceBlockId],
  ]);
});

test('real native coinbase in the same complete block is an ordinary nondeposit', async () => {
  const coinbase = delivered.transactions[0];
  const { chain } = await setup(new MutableSource(guardBlock, coinbase));
  assert.equal(
    await chain.verifyEvent(
      { ...event, sourceTxId: coinbase.txid },
      permissiveFee,
    ),
    false,
  );
});

test('string adapter delegates once and propagates configuration failure', async () => {
  const { options } = await setup();
  const originalWrapAmount = options.tokens.wrapAmount.bind(options.tokens);
  let wrapCalls = 0;
  options.tokens.wrapAmount = (...args: Parameters<TokenMap['wrapAmount']>) => {
    wrapCalls += 1;
    return originalWrapAmount(...args);
  };
  const extractor = new ZcashGuardRosenExtractor(options);
  assert.equal(
    extractor.get(serializeZcashTransaction(deposit))?.amount,
    event.amount,
  );
  assert.equal(wrapCalls, 1);

  await options.tokens.updateConfigByJson([]);
  assert.throws(
    () => extractor.get(serializeZcashTransaction(deposit)),
    /configuration/,
  );
  assert.equal(wrapCalls, 1);
});

test('inherited comparison rejects every authenticated event-field mutation', async () => {
  const mutations: Array<
    [keyof EventTrigger, EventTrigger[keyof EventTrigger]]
  > = [
    ['fromChain', 'bitcoin'],
    ['toChain', 'cardano'],
    ['fromAddress', 'box:' + '00'.repeat(32) + '.0'],
    ['toAddress', event.toAddress.slice(0, -1) + 'Z'],
    ['amount', '99999999'],
    ['bridgeFee', '5001'],
    ['networkFee', '2201'],
    ['sourceChainTokenId', 'other'],
    ['targetChainTokenId', 'ef'.repeat(32)],
    ['sourceTxId', '12'.repeat(32)],
    ['sourceChainHeight', 107],
  ];
  for (const [field, value] of mutations) {
    const { chain } = await setup();
    assert.equal(
      await chain.verifyEvent({ ...event, [field]: value }, permissiveFee),
      false,
      field,
    );
  }

  const { chain } = await setup();
  await assert.rejects(
    chain.verifyEvent(
      { ...event, sourceBlockId: '34'.repeat(32) },
      permissiveFee,
    ),
    /Skipping event/,
  );
});

test('inherited verifyEvent leaves event height and watcher fields to their owning layer', async () => {
  for (const mutation of [
    { height: event.height + 1 },
    { WIDsHash: 'ef'.repeat(32) },
    { WIDsCount: event.WIDsCount + 1 },
  ]) {
    const { chain } = await setup();
    assert.equal(
      await chain.verifyEvent({ ...event, ...mutation }, permissiveFee),
      true,
    );
  }
});

test('request, transaction, block hash, and height evidence fail independently', async () => {
  const inspector = nativeInspector();
  const transactionB = changeOrdinaryOutputByOneZatoshi(inspector);
  const { options: bOptions } = await setup(new MutableSource(), inspector);
  const dataB = new ZcashGuardRosenExtractor(bOptions).get(
    serializeZcashTransaction(transactionB),
  );
  assert.deepEqual(
    dataB && {
      amount: dataB.amount,
      bridgeFee: dataB.bridgeFee,
      networkFee: dataB.networkFee,
      fromAddress: dataB.fromAddress,
      toAddress: dataB.toAddress,
    },
    {
      amount: event.amount,
      bridgeFee: event.bridgeFee,
      networkFee: event.networkFee,
      fromAddress: event.fromAddress,
      toAddress: event.toAddress,
    },
  );
  assert.notEqual(transactionB.txid, event.sourceTxId);
  // Controlled structural block: both A and B are members so only the
  // requested-transaction identity join can reject returning B for A.
  const substitutedBlock = {
    ...guardBlock,
    transactionCount: guardBlock.transactionCount + 1,
    transactionIds: [...guardBlock.transactionIds, transactionB.txid],
  };
  const substituted = new MutableSource(substitutedBlock, transactionB);
  const substitutedChain = (await setup(substituted)).chain;
  await assert.rejects(
    substitutedChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const wrongTxBlock = new MutableSource(guardBlock, {
    ...deposit,
    blockhash: '56'.repeat(32),
  });
  const wrongTxBlockChain = (await setup(wrongTxBlock)).chain;
  await assert.rejects(
    wrongTxBlockChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const heightSplit = new MutableSource();
  heightSplit.blockResponses = [guardBlock, { ...guardBlock, height: 107 }];
  const heightSplitChain = (await setup(heightSplit)).chain;
  await assert.rejects(
    heightSplitChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const membershipSplit = new MutableSource();
  membershipSplit.blockResponses = [
    guardBlock,
    {
      ...guardBlock,
      transactionIds: guardBlock.transactionIds.map((txid) =>
        txid === event.sourceTxId ? '9a'.repeat(32) : txid,
      ),
    },
  ];
  const membershipSplitChain = (await setup(membershipSplit)).chain;
  await assert.rejects(
    membershipSplitChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const wrongBlock = new MutableSource({
    ...guardBlock,
    hash: '78'.repeat(32),
  });
  const wrongBlockChain = (await setup(wrongBlock)).chain;
  await assert.rejects(
    wrongBlockChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );
});

test('invalid or unavailable dependencies defer instead of becoming a negative event', async () => {
  const sparseIds = Array<string>(guardBlock.transactionCount);
  sparseIds[0] = guardBlock.transactionIds[0];
  const invalidBlocks: unknown[] = [
    null,
    { ...guardBlock, hash: '00' },
    { ...guardBlock, hash: guardBlock.hash.toUpperCase() },
    { ...guardBlock, parentHash: '00' },
    { ...guardBlock, height: -1 },
    { ...guardBlock, height: Number.MAX_SAFE_INTEGER + 1 },
    { ...guardBlock, height: -0 },
    { ...guardBlock, transactionCount: 0, transactionIds: [] },
    { ...guardBlock, transactionCount: Number.MAX_SAFE_INTEGER + 1 },
    { ...guardBlock, transactionCount: guardBlock.transactionCount + 1 },
    {
      ...guardBlock,
      transactionIds: [deposit.txid, deposit.txid],
      transactionCount: 2,
    },
    {
      ...guardBlock,
      transactionIds: [
        guardBlock.transactionIds[0].toUpperCase(),
        ...guardBlock.transactionIds.slice(1),
      ],
    },
    {
      ...guardBlock,
      transactionIds: ['00', ...guardBlock.transactionIds.slice(1)],
    },
    { ...guardBlock, transactionIds: sparseIds },
    { ...guardBlock, parentHash: guardBlock.parentHash.toUpperCase() },
  ];
  for (const invalid of invalidBlocks) {
    const network = new TestNetwork(new MutableSource(invalid));
    await assert.rejects(
      network.getBlockInfo(event.sourceBlockId),
      ZcashGuardEvidenceError,
    );
  }

  const failedSource = new MutableSource();
  failedSource.blockError = new NotFoundError('source unavailable');
  const failedNetwork = new TestNetwork(failedSource);
  await assert.rejects(
    failedNetwork.getBlockInfo(event.sourceBlockId),
    ZcashGuardEvidenceError,
  );
  const failedChain = (await setup(failedSource)).chain;
  await assert.rejects(
    failedChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const invalidTransactionNetwork = new TestNetwork(
    new MutableSource(guardBlock, null),
  );
  await assert.rejects(
    invalidTransactionNetwork.getTransaction(
      event.sourceTxId,
      event.sourceBlockId,
    ),
    ZcashGuardEvidenceError,
  );
  const failedTransactionSource = new MutableSource();
  failedTransactionSource.transactionError = new Error(
    'transaction source unavailable',
  );
  const failedTransactionNetwork = new TestNetwork(failedTransactionSource);
  await assert.rejects(
    failedTransactionNetwork.getTransaction(
      event.sourceTxId,
      event.sourceBlockId,
    ),
    ZcashGuardEvidenceError,
  );

  const nativeFailure = new Error('native unavailable');
  const nativeChain = (
    await setup(new MutableSource(), {
      inspect: () => {
        throw nativeFailure;
      },
    })
  ).chain;
  await assert.rejects(
    nativeChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const badRawChain = (
    await setup(
      new MutableSource(guardBlock, { ...deposit, hex: '00', size: 1 }),
    )
  ).chain;
  await assert.rejects(
    badRawChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );

  const wrongBranchChain = (
    await setup(new MutableSource(), nativeInspector(), () => 'deadbeef')
  ).chain;
  await assert.rejects(
    wrongBranchChain.verifyEvent(event, permissiveFee),
    /Skipping event/,
  );
});

test('fee calculation uses both maxima and the exact ratio boundary', async () => {
  const cases: Array<[string, ChainMinimumFee, boolean]> = [
    ['event fees dominate lower configured minima', permissiveFee, true],
    [
      'configured bridge maximum reaches amount',
      new ChainMinimumFee({
        bridgeFee: 99_997_800n,
        networkFee: 0n,
        feeRatio: 0n,
        rsnRatio: 0n,
        rsnRatioDivisor: 10_000n,
      }),
      false,
    ],
    [
      'ratio plus network maximum is one zatoshi below amount',
      new ChainMinimumFee({
        bridgeFee: 0n,
        networkFee: 9_999n,
        feeRatio: 9_999n,
        rsnRatio: 0n,
        rsnRatioDivisor: 10_000n,
      }),
      true,
    ],
    [
      'ratio plus network maximum equals amount',
      new ChainMinimumFee({
        bridgeFee: 0n,
        networkFee: 10_000n,
        feeRatio: 9_999n,
        rsnRatio: 0n,
        rsnRatioDivisor: 10_000n,
      }),
      false,
    ],
  ];
  for (const [name, fee, expected] of cases) {
    const { chain } = await setup();
    assert.equal(await chain.verifyEvent(event, fee), expected, name);
  }

  const zeroDivisor = new ChainMinimumFee({
    bridgeFee: 0n,
    networkFee: 0n,
    feeRatio: 1n,
    rsnRatio: 0n,
    rsnRatioDivisor: 10_000n,
  });
  Object.defineProperty(zeroDivisor, 'feeRatioDivisor', { value: 0n });
  const { chain } = await setup();
  await assert.rejects(chain.verifyEvent(event, zeroDivisor), /Skipping event/);
});

test('simultaneous validations keep independent transaction and event state', async () => {
  const { chain } = await setup();
  const [valid, invalid] = await Promise.all([
    chain.verifyEvent(event, permissiveFee),
    chain.verifyEvent({ ...event, toChain: 'cardano' }, permissiveFee),
  ]);
  assert.deepEqual([valid, invalid], [true, false]);
});
