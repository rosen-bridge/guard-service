import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { RosenTokens } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  EventTrigger,
  PaymentOrder,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { createTransactionApproval } from '../../src/agreement/transactionApproval';
import { DatabaseAction } from '../../src/db/databaseAction';
import { TransactionEntity } from '../../src/db/entities/transactionEntity';
import { ZcashSettlementEntity } from '../../src/db/entities/zcashSettlementEntity';
import { ZcashSigningAttemptEntity } from '../../src/db/entities/zcashSigningAttemptEntity';
import { ZcashSigningAttemptStore } from '../../src/db/zcashSigningAttemptStore';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import { captureZcashEventPolicy } from '../../src/transaction/zcashEventPaymentAuthority';
import { ZcashObservedSigningRecovery } from '../../src/transaction/zcashObservedSigningRecovery';
import type { ZcashSigningBinding } from '../../src/transaction/zcashSigningContext';
import type { ZcashSpentRewardChain } from '../../src/transaction/zcashSpentEventRecoveryAuthority';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';

const source = DatabaseActionMock.testDataSource;
const tokenMap = TokenHandler.getInstance().getTokenMap();
const guardKey =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const genesisHash = 'ee'.repeat(32);
const policy = {
  network: 'testnet' as const,
  genesisHash,
  sourceId: 'zcash-recovery-test',
  requiredConfirmations: 2,
  maximumAgeMs: 60_000,
};
const tokenConfig = (): RosenTokens => [
  {
    zcash: {
      tokenId: 'zec',
      name: 'ZEC',
      decimals: 8,
      type: 'native',
      residency: 'native',
      extra: {},
    },
    ergo: {
      tokenId: 'ab'.repeat(32),
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
    cardano: {
      tokenId: 'cardano-zec',
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
  },
];
const event = (): EventTrigger => ({
  height: 106,
  fromChain: 'cardano',
  toChain: 'zcash',
  fromAddress: 'source',
  toAddress: 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs',
  amount: '100000000',
  bridgeFee: '1000000',
  networkFee: '10000',
  sourceChainTokenId: 'cardano-zec',
  targetChainTokenId: 'zec',
  sourceTxId: '11'.repeat(32),
  sourceChainHeight: 106,
  sourceBlockId: '22'.repeat(32),
  WIDsHash: '33'.repeat(32),
  WIDsCount: 4,
});
const fee = (): ChainMinimumFee =>
  ({
    bridgeFee: 2_000_000n,
    networkFee: 20_000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 100n,
    feeRatioDivisor: 10_000n,
  }) as ChainMinimumFee;
const approval = (approvedTxJson: string): string =>
  createTransactionApproval(approvedTxJson, 1_789_900_000, ['01'.repeat(64)], {
    protocolVersion: '1.0.0',
    guardPublicKeys: [guardKey],
    requiredSign: 1,
  });
const signed = (binding: ZcashSigningBinding): string => {
  const payload = JSON.stringify({
    schema: 1,
    intent: {},
    unsignedTxHex: '00',
    authorization: {
      compactSignatureHex: '01',
      compressedPubkeyHex: guardKey,
      signedTxHex: 'aa',
    },
  });
  return new PaymentTransaction(
    'zcash',
    binding.txId,
    binding.eventId,
    Buffer.from(payload),
    TransactionType.payment,
  ).toJson();
};

let originalTokens: RosenTokens;

beforeAll(() => {
  originalTokens = tokenMap.getRawConfig();
});

beforeEach(async () => {
  await DatabaseActionMock.clearTables();
  await tokenMap.updateConfigByJson(tokenConfig());
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(fee());
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: () => ({ getMinimumNativeToken: () => 1_000n }),
  } as unknown as ChainHandler);
});

afterEach(() => vi.restoreAllMocks());
afterAll(async () => tokenMap.updateConfigByJson(originalTokens));

async function fixture(
  observedHex = 'aa',
  canonicalReward: Partial<{
    signedHex: string;
    txId: string;
    selectedBlockId: string;
    selectedHeight: number;
  }> = {},
) {
  const rawEvent = event();
  const eventId = EventSerializer.getId(rawEvent);
  const txId = 'ab'.repeat(32);
  await DatabaseActionMock.insertEventRecord(
    rawEvent,
    EventStatus.inPayment,
    Buffer.from('zcash-event').toString('base64'),
    rawEvent.sourceChainHeight,
  );
  await source.query(
    `UPDATE "event_trigger_entity"
     SET "spendHeight" = 120, "spendBlock" = ?, "spendTxId" = ?,
         "result" = 'successful', "paymentTxId" = ?
     WHERE "eventId" = ?`,
    ['66'.repeat(32), '55'.repeat(32), txId, eventId],
  );
  const proposed = new PaymentTransaction(
    'zcash',
    txId,
    eventId,
    Buffer.from('01', 'hex'),
    TransactionType.payment,
  );
  const binding: ZcashSigningBinding = {
    schema: 1,
    txId,
    eventId,
    approvedTxJson: proposed.toJson(),
    approvalEvidence: approval(proposed.toJson()),
    requiredSign: 1,
    genesisHash,
    outpoint: `${'ff'.repeat(32)}:0`,
    sighashAll: '12'.repeat(32),
    tssProfileHash: '34'.repeat(32),
  };
  const database = DatabaseAction.getInstance();
  const storedEvent = await database.getEventById(eventId);
  if (!storedEvent) throw Error('event fixture missing');
  await database.insertNewTx(
    proposed,
    storedEvent,
    1,
    null,
    binding.approvalEvidence,
  );
  const attempts = new ZcashSigningAttemptStore(source);
  await attempts.claim('attempt-1', binding);
  await attempts.markMayDispatch('attempt-1', binding);
  const [paymentAddress, paymentAmount] = JSON.parse(
    captureZcashEventPolicy(rawEvent).payment,
  ) as [string, string];
  const payoutPayments = Object.freeze([
    Object.freeze({
      address: paymentAddress,
      assets: Object.freeze({
        nativeToken: BigInt(paymentAmount),
        tokens: Object.freeze([]),
      }),
    }),
  ]) as unknown as PaymentOrder;
  const validate = vi.fn(() => payoutPayments);
  const observe = vi.fn(async () => ({
    kind: 'confirmed' as const,
    txId,
    hex: observedHex,
    blockHash: '44'.repeat(32),
    height: 120,
    confirmations: 3,
  }));
  const rewardTxId = '55'.repeat(32);
  const rewardJson = JSON.stringify(
    {
      network: 'ergo',
      txId: rewardTxId,
      eventId,
      txBytes: '00',
      txType: TransactionType.reward,
      inputBoxes: [],
      dataInputs: [],
    },
    [
      'dataInputs',
      'eventId',
      'inputBoxes',
      'network',
      'txBytes',
      'txId',
      'txType',
    ],
  );
  const ergoChain = {
    decodeReward: vi.fn(() => ({
      network: 'ergo',
      txId: rewardTxId,
      eventId,
      txBytes: Buffer.from('00', 'hex'),
      txType: TransactionType.reward,
      toJson: () => rewardJson,
    })),
    verifySignedPaymentTransaction: vi.fn(async () => true),
    verifyTransactionExtraConditions: vi.fn(() => true),
    observeCanonicalReward: vi.fn(async () => ({
      signedHex: canonicalReward.signedHex ?? '00',
      txId: canonicalReward.txId ?? rewardTxId,
      selectedBlockId: canonicalReward.selectedBlockId ?? '66'.repeat(32),
      selectedHeight: canonicalReward.selectedHeight ?? 120,
    })),
    extractSignedTransactionOrder: vi.fn(() => []),
    getTxConfirmationStatus: vi.fn(
      async () => ConfirmationStatus.ConfirmedEnough,
    ),
    getTxRequiredConfirmation: vi.fn(() => 2),
  } as unknown as ZcashSpentRewardChain;
  const recovery = new ZcashObservedSigningRecovery(
    source,
    { validate, observe, policy: () => policy },
    ergoChain,
    async () => [],
  );
  return {
    txId,
    eventId,
    binding,
    candidate: signed(binding),
    rewardJson,
    rewardTxId,
    recovery,
  };
}

describe('observed Zcash signing recovery', () => {
  it('atomically adopts only an exact confirmed candidate and settles it', async () => {
    const f = await fixture();
    const completed = await f.recovery.recover(
      f.txId,
      f.candidate,
      f.rewardJson,
    );
    expect(completed).toMatchObject({
      txId: f.txId,
      status: TransactionStatus.completed,
      signedTxJson: f.candidate,
    });
    expect(
      await source.getRepository(ZcashSigningAttemptEntity).findOneByOrFail({
        attemptId: 'attempt-1',
      }),
    ).toMatchObject({ state: 'signed', signedJson: f.candidate });
    expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(1);
    expect(
      (await DatabaseAction.getInstance().getEventById(f.eventId))!.status,
    ).toBe(EventStatus.completed);
    expect(
      await source.getRepository(TransactionEntity).findOneByOrFail({
        txId: f.rewardTxId,
      }),
    ).toMatchObject({
      txJson: f.rewardJson,
      type: TransactionType.reward,
      chain: 'ergo',
      status: TransactionStatus.completed,
    });
  });

  it('rejects different on-chain bytes without changing custody', async () => {
    const f = await fixture('bb');
    await expect(
      f.recovery.recover(f.txId, f.candidate, f.rewardJson),
    ).rejects.toThrow(/observation identity/i);
    expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
    expect(
      await source.getRepository(ZcashSigningAttemptEntity).findOneByOrFail({
        attemptId: 'attempt-1',
      }),
    ).toMatchObject({ state: 'may_dispatch', signedJson: null });
  });

  it.each([
    ['signed transaction bytes', { signedHex: '01' }],
    ['signed transaction id', { txId: '77'.repeat(32) }],
    ['selected-chain block id', { selectedBlockId: '77'.repeat(32) }],
    ['selected-chain block height', { selectedHeight: 121 }],
  ])('rejects a mismatched Ergo %s', async (_label, canonicalReward) => {
    const f = await fixture('aa', canonicalReward);
    await expect(
      f.recovery.recover(f.txId, f.candidate, f.rewardJson),
    ).rejects.toThrow(/canonical reward confirmation/i);
    expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
    expect(
      await source.getRepository(ZcashSigningAttemptEntity).findOneByOrFail({
        attemptId: 'attempt-1',
      }),
    ).toMatchObject({ state: 'may_dispatch', signedJson: null });
  });

  it('rolls every adoption write back when settlement cannot finish', async () => {
    const f = await fixture();
    await source.query(
      `CREATE TRIGGER recovery_event_failure
       BEFORE UPDATE ON "confirmed_event_entity"
       WHEN NEW."status" = 'completed'
       BEGIN SELECT RAISE(ABORT, 'controlled recovery failure'); END`,
    );
    try {
      await expect(
        f.recovery.recover(f.txId, f.candidate, f.rewardJson),
      ).rejects.toThrow();
    } finally {
      await source.query('DROP TRIGGER recovery_event_failure');
    }
    expect(await source.getRepository(ZcashSettlementEntity).count()).toBe(0);
    expect(
      await source.getRepository(TransactionEntity).countBy({
        txId: f.rewardTxId,
      }),
    ).toBe(0);
    expect(
      await source.getRepository(ZcashSigningAttemptEntity).findOneByOrFail({
        attemptId: 'attempt-1',
      }),
    ).toMatchObject({ state: 'may_dispatch', signedJson: null });
    expect(
      await source.getRepository(TransactionEntity).findOneByOrFail({
        txId: f.txId,
      }),
    ).toMatchObject({
      status: TransactionStatus.inSign,
      txJson: f.binding.approvedTxJson,
    });
    expect(
      (await DatabaseAction.getInstance().getEventById(f.eventId))!.status,
    ).toBe(EventStatus.inPayment);
  });
});
