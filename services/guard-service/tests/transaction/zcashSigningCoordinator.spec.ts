import { createHash } from 'node:crypto';

import { Communicator } from '@rosen-bridge/communication';
import { ECDSA } from '@rosen-bridge/encryption';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import { RosenTokens } from '@rosen-bridge/tokens';
import {
  AbstractChain,
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import {
  calculateApprovalHash,
  createTransactionApproval,
} from '../../src/agreement/transactionApproval';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ZcashSigningAttemptEntity } from '../../src/db/entities/zcashSigningAttemptEntity';
import { ZcashSigningAttemptStore } from '../../src/db/zcashSigningAttemptStore';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import TransactionProcessor from '../../src/transaction/transactionProcessor';
import {
  ZcashApprovedSigningCapability,
  ZcashDispatchObservation,
  ZcashSigningCoordinator,
} from '../../src/transaction/zcashSigningCoordinator';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockEventTrigger } from '../event/testData';
import { chainHandlerInstance } from '../handlers/chainHandler.mock';
import TestConfigs from '../testUtils/testConfigs';

// Real approval signatures and real SQLite custody; native chain/TSS capability
// is controlled here and must be qualified separately by the chain campaign.
const signers = [1, 2, 3, 4].map(
  (i) => new ECDSA(i.toString(16).padStart(64, '0')),
);
const db = () => DatabaseAction.getInstance();
const tokenMap = TokenHandler.getInstance().getTokenMap();
const zecErgoId = 'ab'.repeat(32);
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
      tokenId: zecErgoId,
      name: 'rsZEC',
      decimals: 8,
      type: 'token',
      residency: 'wrapped',
      extra: {},
    },
  },
];
const feeConfig = (): ChainMinimumFee =>
  ({
    bridgeFee: 2_000_000n,
    networkFee: 20_000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 100n,
    feeRatioDivisor: 10_000n,
  }) as ChainMinimumFee;
let originalTokens: RosenTokens;
let oldKeys: string[];
let oldThreshold: number;
beforeAll(() => {
  originalTokens = tokenMap.getRawConfig();
});
beforeEach(async () => {
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue(
    chainHandlerInstance as unknown as ChainHandler,
  );
  vi.spyOn(chainHandlerInstance, 'getChain').mockImplementation(
    (chain: string) => {
      if (chain !== 'zcash') throw Error(`unexpected chain ${chain}`);
      return {
        getMinimumNativeToken: () => 1_000n,
      } as unknown as AbstractChain<unknown>;
    },
  );
  await tokenMap.updateConfigByJson(tokenConfig());
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(feeConfig());
  oldKeys = TestConfigs.guardPublicKeys;
  oldThreshold = TestConfigs.requiredSigns;
  TestConfigs.guardPublicKeys = await Promise.all(
    signers.map((s) => s.getPk()),
  );
  TestConfigs.requiredSigns = 3;
  await DatabaseActionMock.clearTables();
});
afterEach(() => {
  TestConfigs.guardPublicKeys = oldKeys;
  TestConfigs.requiredSigns = oldThreshold;
  vi.restoreAllMocks();
});
afterAll(async () => {
  await tokenMap.updateConfigByJson(originalTokens);
});
const policy = () => ({
  protocolVersion: '1.0.0' as const,
  guardPublicKeys: [...TestConfigs.guardPublicKeys],
  requiredSign: TestConfigs.requiredSigns,
});

async function fixture(proof = true) {
  const event = mockEventTrigger().event;
  event.fromChain = 'ergo';
  event.toChain = 'zcash';
  event.sourceChainTokenId = zecErgoId;
  event.targetChainTokenId = 'zec';
  const eventId = EventSerializer.getId(event);
  await DatabaseActionMock.insertEventRecord(event, EventStatus.inPayment);
  const tx = new PaymentTransaction(
    'zcash',
    'ab'.repeat(32),
    eventId,
    Buffer.from('approved'),
    TransactionType.payment,
  );
  const signed = new PaymentTransaction(
    'zcash',
    tx.txId,
    eventId,
    Buffer.from('signed'),
    TransactionType.payment,
  );
  const timestamp = 1700000000;
  const signatures = await Promise.all(
    signers.map(async (s, i) =>
      s.sign(
        Communicator.generatePayloadToSign(
          { txDataHash: calculateApprovalHash(tx.toJson()) },
          timestamp,
          TestConfigs.guardPublicKeys[i],
          '1.0.0',
        ),
      ),
    ),
  );
  signatures[3] = '';
  const approval = createTransactionApproval(
    tx.toJson(),
    timestamp,
    signatures,
    policy(),
  );
  const eventRow = await db().getEventById(eventId);
  await db().insertNewTx(tx, eventRow, 3, null, proof ? approval : undefined);
  const row = (await db().getTxById(tx.txId))!;
  const inputs = {
    genesisHash: 'ee'.repeat(32),
    outpoint: 'ff'.repeat(32) + ':0',
    sighashAll: '12'.repeat(32),
    tssProfileHash: '34'.repeat(32),
  };
  const observation = (): ZcashDispatchObservation => ({
    ...inputs,
    candidateSha256: createHash('sha256').update(tx.toJson()).digest('hex'),
  });
  let dispatches = 0;
  const capability: ZcashApprovedSigningCapability = {
    prepareApprovedSigning: vi.fn(async (_json, authority) => {
      expect(authority.eventId).toBe(eventId);
      expect(Object.isFrozen(authority)).toBe(true);
      return { inputs: { ...inputs } };
    }),
    signApprovedTransaction: vi.fn(async (_json, gate) => {
      await gate(observation());
      dispatches++;
      return signed;
    }),
    validateSignedAgainstApproval: vi.fn((value) => value),
  };
  const store = new ZcashSigningAttemptStore(db().dataSource);
  const coordinator = () =>
    new ZcashSigningCoordinator(
      db().dataSource,
      capability,
      policy,
      signers[0],
    );
  return {
    tx,
    signed,
    row,
    inputs,
    observation,
    capability,
    store,
    coordinator,
    dispatches: () => dispatches,
  };
}

describe('Zcash durable signing consumer', () => {
  it('durably reserves without native dispatch and continues the same opaque task once', async () => {
    const f = await fixture();
    const coordinator = f.coordinator();
    const reservation = await coordinator.reserve(f.row);
    expect(Object.isFrozen(reservation)).toBe(true);
    expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
    expect((await f.store.getActive(f.tx.txId))!.attemptId).toBe(
      reservation.attemptId,
    );
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('prepared');
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.inSign,
    );

    await reservation.assertCurrent();
    expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
    const task = reservation.continue();
    expect(task.attemptId).toBe(reservation.attemptId);
    await task.completion;

    expect(f.capability.signApprovedTransaction).toHaveBeenCalledTimes(1);
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
    expect(() => reservation.continue()).toThrow(/already continued/);
    await expect(reservation.assertCurrent()).rejects.toThrow(
      /already continued/,
    );
    const replay = JSON.parse(JSON.stringify(reservation));
    expect(replay).toEqual({ attemptId: reservation.attemptId });
    expect(replay.continue).toBeUndefined();
  });

  it('reaches the actual SQLite claim conflict before any native dispatch, then continues the winner', async () => {
    const f = await fixture();
    const coordinator = f.coordinator();
    const winner = await coordinator.reserve(f.row);

    await expect(coordinator.reserve(f.row)).rejects.toThrow(
      /signing attempt conflict/,
    );
    const retained = await f.store.getActive(f.tx.txId);
    expect(retained!.attemptId).toBe(winner.attemptId);
    expect(retained!.state).toBe('prepared');
    expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();

    await winner.continue().completion;
    expect(f.capability.signApprovedTransaction).toHaveBeenCalledTimes(1);
    expect((await f.store.getActive(f.tx.txId))!.attemptId).toBe(
      winner.attemptId,
    );
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
  });

  it('keeps one prepared assignment across a temporary currentness outage and resumes it without native work during refusal', async () => {
    const f = await fixture();
    let available = true;
    const prepare = f.capability.prepareApprovedSigning;
    f.capability.prepareApprovedSigning = vi.fn(async (json, authority) => {
      if (!available) throw Error('public proof metadata unavailable');
      return prepare(json, authority);
    });
    const reservation = await f.coordinator().reserve(f.row);
    const attemptId = reservation.attemptId;

    available = false;
    await expect(reservation.assertCurrent()).rejects.toThrow(
      /public proof metadata unavailable/,
    );
    expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
    expect((await f.store.getActive(f.tx.txId))!.attemptId).toBe(attemptId);
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('prepared');

    available = true;
    await reservation.assertCurrent();
    await reservation.continue().completion;
    expect(f.capability.signApprovedTransaction).toHaveBeenCalledTimes(1);
    expect((await f.store.getActive(f.tx.txId))!.attemptId).toBe(attemptId);
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
  });

  it.each([
    ['status', { status: TransactionStatus.sent }],
    ['attempt binding', { signingAttemptId: 'foreign-attempt' }],
    ['approval snapshot', { approvalEvidence: '{}' }],
  ] as const)(
    'retains the assignment and refuses native dispatch when the reserved row %s changes',
    async (_case, mutation) => {
      const f = await fixture();
      const reservation = await f.coordinator().reserve(f.row);
      await db().TransactionRepository.update({ txId: f.tx.txId }, mutation);

      await expect(reservation.continue().completion).rejects.toThrow(
        /reserved signing row changed/,
      );
      expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
      const active = await f.store.getActive(f.tx.txId);
      expect(active!.attemptId).toBe(reservation.attemptId);
      expect(active!.state).toBe('prepared');
    },
  );

  it.each([
    ['binding', { bindingJson: '{}' }, 'prepared'],
    ['event key', { eventKey: 'zcash:payment:other' }, 'prepared'],
    ['input key', { inputKey: 'other:0' }, 'prepared'],
    ['state', { state: 'may_dispatch' }, 'may_dispatch'],
  ] as const)(
    'retains the assignment and refuses native dispatch when the active attempt %s changes',
    async (_case, mutation, retainedState) => {
      const f = await fixture();
      const reservation = await f.coordinator().reserve(f.row);
      await db()
        .dataSource.getRepository(ZcashSigningAttemptEntity)
        .update({ attemptId: reservation.attemptId }, mutation);

      await expect(reservation.continue().completion).rejects.toThrow(
        /reserved signing attempt changed/,
      );
      expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
      const active = await f.store.getActive(f.tx.txId);
      expect(active!.attemptId).toBe(reservation.attemptId);
      expect(active!.state).toBe(retainedState);
    },
  );

  it.each([
    ['genesisHash', 'aa'.repeat(32)],
    ['outpoint', 'bb'.repeat(32) + ':1'],
    ['sighashAll', 'cc'.repeat(32)],
    ['tssProfileHash', 'dd'.repeat(32)],
  ] as const)(
    'abandons a still-prepared reservation when fresh %s changes before continue',
    async (field, changed) => {
      const f = await fixture();
      let preparations = 0;
      f.capability.prepareApprovedSigning = vi.fn(async () => ({
        inputs: {
          ...f.inputs,
          ...(preparations++ === 0 ? {} : { [field]: changed }),
        },
      }));
      const reservation = await f.coordinator().reserve(f.row);

      await expect(reservation.continue().completion).rejects.toThrow(
        /inputs changed/,
      );
      expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
      expect(await f.store.getActive(f.tx.txId)).toBeNull();
      expect((await db().getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.approved,
      );
    },
  );

  it('abandons a still-prepared reservation when approval policy changes before continue', async () => {
    const f = await fixture();
    const reservation = await f.coordinator().reserve(f.row);
    TestConfigs.requiredSigns = 2;

    await expect(reservation.continue().completion).rejects.toThrow(
      /policy mismatch/,
    );
    expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.approved,
    );
  });

  it('abandons a still-prepared reservation when the captured event changes before continue', async () => {
    const f = await fixture();
    const reservation = await f.coordinator().reserve(f.row);
    const event = await db().getEventById(f.tx.eventId);
    await db().EventRepository.update(
      { id: event!.eventData.id },
      { amount: '49999999999' },
    );

    await expect(reservation.continue().completion).rejects.toThrow(
      /stored event changed/,
    );
    expect(f.capability.signApprovedTransaction).not.toHaveBeenCalled();
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.approved,
    );
  });

  it('does not send legacy uncertified Zcash rows through generic signing', async () => {
    const f = await fixture(false);
    const legacy = vi.fn(() => new Promise<PaymentTransaction>(() => {}));
    vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue({
      signTransaction: legacy,
    } as unknown as AbstractChain<unknown>);
    vi.spyOn(chainHandlerInstance, 'getZcashSigningCapability').mockReturnValue(
      f.capability,
    );
    await TransactionProcessor.processApprovedTx(f.row);
    expect(legacy).not.toHaveBeenCalled();
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.approved,
    );
  });

  it('actual processor persists a signed result without a height RPC', async () => {
    const f = await fixture();
    const getHeight = vi.fn(async () => {
      throw Error('height unavailable after signing');
    });
    const legacy = vi.fn();
    vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue({
      getHeight,
      getMinimumNativeToken: () => 1_000n,
      signTransaction: legacy,
    } as unknown as AbstractChain<unknown>);
    vi.spyOn(chainHandlerInstance, 'getZcashSigningCapability').mockReturnValue(
      f.capability,
    );
    await TransactionProcessor.processApprovedTx(f.row);
    await vi.waitFor(async () =>
      expect((await db().getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.signed,
      ),
    );
    expect((await db().getTxById(f.tx.txId))!.txJson).toBe(f.signed.toJson());
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
    expect(legacy).not.toHaveBeenCalled();
    expect(getHeight).not.toHaveBeenCalled();
  });

  it('does not fall back to chain signing when the configured capability is unavailable', async () => {
    const f = await fixture();
    const legacy = vi.fn();
    vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue({
      ...f.capability,
      signTransaction: legacy,
    } as unknown as AbstractChain<unknown>);
    vi.spyOn(
      chainHandlerInstance,
      'getZcashSigningCapability',
    ).mockImplementation(() => {
      throw Error('Zcash is not enabled');
    });
    await TransactionProcessor.processApprovedTx(f.row);
    expect(legacy).not.toHaveBeenCalled();
    expect(f.capability.prepareApprovedSigning).not.toHaveBeenCalled();
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.approved,
    );
  });

  it('requires a capability before claiming or dispatching', async () => {
    const f = await fixture();
    expect(
      () =>
        new ZcashSigningCoordinator(
          db().dataSource,
          {} as ZcashApprovedSigningCapability,
          policy,
          signers[0],
        ),
    ).toThrow(/capability/);
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
  });

  it('rejects a corrupted approval signature before native preparation', async () => {
    const f = await fixture();
    const bad = JSON.parse(f.row.approvalEvidence!);
    bad.signatures[1] = bad.signatures[0];
    f.row.approvalEvidence = JSON.stringify(bad);
    await db().TransactionRepository.update(
      { txId: f.tx.txId },
      { approvalEvidence: f.row.approvalEvidence },
    );
    await expect(f.coordinator().start(f.row)).rejects.toThrow(/signature/);
    expect(f.capability.prepareApprovedSigning).not.toHaveBeenCalled();
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
  });

  it.each(['requiredSign', 'approvedTxJson'] as const)(
    'rejects a valid certificate mismatched to row %s before native preparation',
    async (field) => {
      const f = await fixture();
      if (field === 'requiredSign') f.row.requiredSign = 2;
      else f.row.txJson = f.signed.toJson();
      await expect(f.coordinator().start(f.row)).rejects.toThrow(/binding/);
      expect(f.capability.prepareApprovedSigning).not.toHaveBeenCalled();
      expect(await f.store.getActive(f.tx.txId)).toBeNull();
    },
  );

  for (const field of [
    'genesisHash',
    'outpoint',
    'sighashAll',
    'tssProfileHash',
    'candidateSha256',
  ] as const)
    it(`rejects changed dispatch ${field} without dispatch`, async () => {
      const f = await fixture();
      let calls = 0;
      f.capability.signApprovedTransaction = vi.fn(async (_json, gate) => {
        await gate({ ...f.observation(), [field]: '00'.repeat(32) });
        calls++;
        return f.signed;
      });
      const task = await f.coordinator().start(f.row);
      await expect(task.completion).rejects.toThrow(/reserved signing input/);
      expect(calls).toBe(0);
      expect(await f.store.getActive(f.tx.txId)).toBeNull();
      expect((await db().getTxById(f.tx.txId))!.signingAttemptId).toBeNull();
    });

  it('releases only a prepared refusal and allows a fresh attempt', async () => {
    const f = await fixture();
    const sign = f.capability.signApprovedTransaction;
    f.capability.signApprovedTransaction = vi.fn(async () => {
      throw Error('source unavailable');
    });
    const first = await f.coordinator().start(f.row);
    await expect(first.completion).rejects.toThrow('source unavailable');
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
    f.capability.signApprovedTransaction = sign;
    const second = await f
      .coordinator()
      .start((await db().getTxById(f.tx.txId))!);
    await second.completion;
    expect(second.attemptId).not.toBe(first.attemptId);
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
  });

  it('retains an uncertain dispatched attempt and ignores an empty in-memory signer queue', async () => {
    const f = await fixture();
    f.capability.signApprovedTransaction = vi.fn(async (_json, gate) => {
      await gate(f.observation());
      throw Error('response lost');
    });
    const task = await f.coordinator().start(f.row);
    await expect(task.completion).rejects.toThrow('response lost');
    const retained = (await db().getTxById(f.tx.txId))!;
    const isInSign = vi.fn(async () => false);
    vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue({
      isTransactionInSign: isInSign,
    } as unknown as AbstractChain<unknown>);
    await TransactionProcessor.processInSignTx(retained);
    expect(isInSign).not.toHaveBeenCalled();
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.inSign,
    );
    await expect(f.coordinator().start(retained)).rejects.toThrow(/unclaimed/);
  });

  it('policy drift during the durable gate stops dispatch and retains custody', async () => {
    const f = await fixture();
    const original = ZcashSigningAttemptStore.prototype.markMayDispatch;
    vi.spyOn(
      ZcashSigningAttemptStore.prototype,
      'markMayDispatch',
    ).mockImplementation(async function (
      this: ZcashSigningAttemptStore,
      id,
      binding,
      authority,
    ) {
      await original.call(this, id, binding, authority);
      TestConfigs.requiredSigns = 2;
    });
    const task = await f.coordinator().start(f.row);
    await expect(task.completion).rejects.toThrow(/policy mismatch/);
    expect(f.dispatches()).toBe(0);
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
  });

  it('rejects a persisted destination mutation before the claim is committed', async () => {
    const f = await fixture();
    const original = ZcashSigningAttemptStore.prototype.claim;
    vi.spyOn(ZcashSigningAttemptStore.prototype, 'claim').mockImplementation(
      async function (this: ZcashSigningAttemptStore, id, binding, authority) {
        const event = await db().getEventById(f.tx.eventId);
        await db().EventRepository.update(
          { id: event!.eventData.id },
          { toAddress: 'tampered-destination' },
        );
        return original.call(this, id, binding, authority);
      },
    );
    await expect(f.coordinator().start(f.row)).rejects.toThrow(
      /stored event changed/,
    );
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
  });

  it('rejects a persisted amount mutation during the durable dispatch gate', async () => {
    const f = await fixture();
    const original = ZcashSigningAttemptStore.prototype.markMayDispatch;
    vi.spyOn(
      ZcashSigningAttemptStore.prototype,
      'markMayDispatch',
    ).mockImplementation(async function (
      this: ZcashSigningAttemptStore,
      id,
      binding,
      authority,
    ) {
      const event = await db().getEventById(f.tx.eventId);
      await db().EventRepository.update(
        { id: event!.eventData.id },
        { amount: '49999999999' },
      );
      return original.call(this, id, binding, authority);
    });
    const task = await f.coordinator().start(f.row);
    await expect(task.completion).rejects.toThrow(/stored event changed/);
    expect(f.dispatches()).toBe(0);
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
  });

  it('rejects a persisted fee mutation on the repeated durable authorization gate', async () => {
    const f = await fixture();
    f.capability.signApprovedTransaction = vi.fn(
      async (_json, gate, _prepared, authorization) => {
        await gate(f.observation());
        const event = await db().getEventById(f.tx.eventId);
        await db().EventRepository.update(
          { id: event!.eventData.id },
          { bridgeFee: '999999999' },
        );
        await authorization.authorize(f.observation());
        return f.signed;
      },
    );
    const task = await f.coordinator().start(f.row);
    await expect(task.completion).rejects.toThrow(/stored event changed/);
    expect(f.dispatches()).toBe(0);
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
  });

  it('uses the persisted authority snapshot instead of caller-supplied event data', async () => {
    const f = await fixture();
    const callerRow = {
      ...f.row,
      event: {
        ...f.row.event!,
        eventData: {
          ...f.row.event!.eventData!,
          toAddress: 'fake-caller-destination',
          amount: '1',
        },
      },
    } as typeof f.row;
    const task = await f.coordinator().start(callerRow);
    expect(
      vi.mocked(f.capability.prepareApprovedSigning).mock.calls[0][1]
        .payments[0].address,
    ).toBe('toAddress');
    await task.completion;
  });

  it.each([EventStatus.rejected, EventStatus.spent])(
    'rejects event revocation %s before dispatch and does not reactivate it',
    async (status) => {
      const f = await fixture();
      f.capability.signApprovedTransaction = vi.fn(async (_json, gate) => {
        await db().setEventStatus(f.tx.eventId, status);
        await expect(
          db().setEventStatus(f.tx.eventId, EventStatus.inPayment),
        ).rejects.toThrow(/custody/);
        await gate(f.observation());
        return f.signed;
      });
      const task = await f.coordinator().start(f.row);
      await expect(task.completion).rejects.toThrow(/conflict/);
      expect((await db().getEventById(f.tx.eventId))!.status).toBe(status);
      expect(
        (await db().getEventById(f.tx.eventId))!.zcashSigningAttemptId,
      ).toBeNull();
    },
  );

  it('preserves a valid signed outcome after post-dispatch revocation', async () => {
    const f = await fixture();
    f.capability.signApprovedTransaction = vi.fn(async (_json, gate) => {
      await gate(f.observation());
      await db().setEventStatus(f.tx.eventId, EventStatus.rejected);
      return f.signed;
    });
    await (
      await f.coordinator().start(f.row)
    ).completion;
    expect((await f.store.getActive(f.tx.txId))!.signedJson).toBe(
      f.signed.toJson(),
    );
    expect((await db().getEventById(f.tx.eventId))!.status).toBe(
      EventStatus.rejected,
    );
  });

  it('cannot complete without the per-attempt gate', async () => {
    const f = await fixture();
    f.capability.signApprovedTransaction = vi.fn(async () => f.signed);
    await expect(
      (await f.coordinator().start(f.row)).completion,
    ).rejects.toThrow(/conflict/);
    expect((await db().getTxById(f.tx.txId))!.txJson).toBe(f.tx.toJson());
    expect(await f.store.getActive(f.tx.txId)).toBeNull();
  });

  it('retains custody when native signed validation rejects the result', async () => {
    const f = await fixture();
    f.capability.validateSignedAgainstApproval = vi.fn(() => {
      throw Error('native mismatch');
    });
    await expect(
      (await f.coordinator().start(f.row)).completion,
    ).rejects.toThrow('native mismatch');
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
    expect((await db().getTxById(f.tx.txId))!.txJson).toBe(f.tx.toJson());
  });

  it('requires dedicated settlement proof after signed and sent progression', async () => {
    const f = await fixture();
    await (
      await f.coordinator().start(f.row)
    ).completion;
    await expect(
      db().setTxStatus(f.tx.txId, TransactionStatus.completed),
    ).rejects.toThrow(/custody or state/);
    await expect(
      db().setEventStatusToPending(f.tx.eventId, EventStatus.pendingReward),
    ).rejects.toThrow(/custody/);
    await db().setTxStatus(f.tx.txId, TransactionStatus.sent);
    await expect(
      db().setTxStatus(f.tx.txId, TransactionStatus.completed),
    ).rejects.toThrow(/custody or state/);
    await expect(
      db().setEventStatusToPending(f.tx.eventId, EventStatus.pendingReward),
    ).rejects.toThrow(/custody/);
    expect((await db().getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.sent,
    );
    expect((await db().getEventById(f.tx.eventId))!.status).toBe(
      EventStatus.inPayment,
    );
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
    await expect(
      db().setTxStatus(f.tx.txId, TransactionStatus.approved),
    ).rejects.toThrow(/custody/);
    await expect(
      db().setEventStatus(f.tx.eventId, EventStatus.pendingPayment),
    ).rejects.toThrow(/custody/);
  });
});
