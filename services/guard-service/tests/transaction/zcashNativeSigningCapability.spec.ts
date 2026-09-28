import { Communicator } from '@rosen-bridge/communication';
import { GuardDetection } from '@rosen-bridge/detection';
import { ECDSA } from '@rosen-bridge/encryption';
import { NativeZcashInspector } from '@rosen-bridge/rosen-extractor';
import { TokenMap } from '@rosen-bridge/tokens';
import { EcdsaSigner, StatusEnum } from '@rosen-bridge/tss';
import { TransactionType } from '@rosen-chains/abstract-chain';
import {
  NativePaymentClient,
  ZcashPaymentEvidence,
  ZcashTransaction,
  type ZcashPaymentIntent,
} from '@rosen-chains/zcash-payment';

import {
  calculateApprovalHash,
  createTransactionApproval,
} from '../../src/agreement/transactionApproval';
import Configs from '../../src/configs/configs';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ZcashSigningAttemptStore } from '../../src/db/zcashSigningAttemptStore';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import TssHandler from '../../src/handlers/tssHandler';
import { ZcashEventPaymentAuthority } from '../../src/transaction/zcashEventPaymentAuthority';
import {
  ZcashNativeSigningCapability,
  type ZcashNativeSigningPolicy,
} from '../../src/transaction/zcashNativeSigningCapability';
import { ZcashSigningCoordinator } from '../../src/transaction/zcashSigningCoordinator';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockEventTrigger } from '../event/testData';
import block from './zcashFixtures/payment-evidence-block-106.json' with { type: 'json' };
import signature from './zcashFixtures/tss-signature.json' with { type: 'json' };
import withdrawal from './zcashFixtures/withdrawal-input.json' with { type: 'json' };

// Native byte validation, real approval crypto/SQLite and the bound client; transport/backend responses are controlled.
const env = (name: string) => {
  const value = process.env[name];
  if (!value) throw Error(name + ' is required');
  return value;
};
const native = new NativePaymentClient({
  executablePath: env('ZCASH_PAYMENT_BIN'),
  expectedSha256: env('ZCASH_PAYMENT_SHA256'),
});
const inspector = new NativeZcashInspector({
  executablePath: env('ZCASH_INSPECTOR_BIN'),
  expectedSha256: env('ZCASH_INSPECTOR_SHA256'),
});
const genesis =
  '029f11d80ef9765602235e1bc9727e3eb6ba20839319f761fee920d63401e327';
const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const payout = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const approvalKeys = [1, 2, 3].map(
  (i) => new ECDSA(i.toString(16).padStart(64, '0')),
);
const savedKeys = Configs.tssKeys;
const readinessTimeoutMs = 5000;
const quiescenceTimeoutMs = 5000;
vi.setConfig({ testTimeout: 15000, hookTimeout: 10000 });
const fixtureCleanup: Array<() => Promise<void>> = [];
let quiescenceFailure: unknown;
const bounded = async <T>(operation: Promise<T>, milliseconds: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(Error(message)), milliseconds); }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
};
type Lifecycle = { settled: boolean; rejected: boolean; error?: unknown };
class InspectableSigner extends EcdsaSigner {
  api = () => this.axios;
  queue = () => this.signs;
}
class InstalledHandler extends TssHandler {
  constructor() {
    super();
  }
  static install(signer: EcdsaSigner) {
    TssHandler.tssCurveSigner = signer;
  }
}
beforeEach(async () => {
  // Never clear the shared SQLite connection while an earlier task can still write.
  if (quiescenceFailure !== undefined) throw quiescenceFailure;
  await DatabaseActionMock.clearTables();
});
afterEach(async () => {
  try {
    for (const close of fixtureCleanup) await close();
  } catch (error) {
    quiescenceFailure = error;
    throw error;
  }
  fixtureCleanup.length = 0;
  Configs.tssKeys = savedKeys;
  vi.restoreAllMocks();
});

async function fixture(twoGuards = false) {
  const tokenMap = new TokenMap();
  await tokenMap.updateConfigByJson([
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
    },
  ]);
  vi.spyOn(TokenHandler.getInstance(), 'getTokenMap').mockReturnValue(tokenMap);
  const feePolicy = {
    bridgeFee: 2000n,
    networkFee: 1000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 0n,
    feeRatioDivisor: 1n,
  };
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(feePolicy);
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: () => ({ getMinimumNativeToken: () => 1000n }),
  } as unknown as ChainHandler);
  const event = mockEventTrigger().event;
  event.fromChain = 'ergo';
  event.sourceChainTokenId = 'ab'.repeat(32);
  event.toChain = 'zcash';
  event.targetChainTokenId = 'zec';
  event.toAddress = payout;
  event.amount = (BigInt(withdrawal.amount_zat) + 2000n).toString();
  event.bridgeFee = '0';
  event.networkFee = '0';
  const eventId = EventSerializer.getId(event);
  const intent: ZcashPaymentIntent = {
    network: 'regtest',
    eventId,
    txType: TransactionType.payment,
    reserveAddress: reserve,
    branchId: withdrawal.expected_branch_id,
    lockTime: 0,
    expiryHeight: withdrawal.expiry_height,
    sequence: 0xfffffffe,
    input: {
      txid: withdrawal.prevout.txid,
      index: withdrawal.prevout.vout,
      amountZat: BigInt(withdrawal.prevout.amount_zat),
      scriptPubKeyHex: withdrawal.prevout.script_pubkey_hex,
    },
    payments: [
      {
        address: event.toAddress,
        assets: { nativeToken: BigInt(withdrawal.amount_zat), tokens: [] },
      },
    ],
    feeZat: BigInt(withdrawal.fee_zat),
  };
  const tx = ZcashTransaction.create(intent, native, inspector);
  expect(tx.getDigest().sighash_all).toBe(signature.digest);
  const approvalPolicy = {
    protocolVersion: '1.0.0' as const,
    guardPublicKeys: await Promise.all(approvalKeys.map((k) => k.getPk())),
    requiredSign: 2,
  };
  const signs = await Promise.all(
    approvalKeys.map((key, i) =>
      key.sign(
        Communicator.generatePayloadToSign(
          { txDataHash: calculateApprovalHash(tx.toJson()) },
          1700000000,
          approvalPolicy.guardPublicKeys[i],
          '1.0.0',
        ),
      ),
    ),
  );
  signs[2] = '';
  const approval = createTransactionApproval(
    tx.toJson(),
    1700000000,
    signs,
    approvalPolicy,
  );
  const db = DatabaseAction.getInstance();
  await DatabaseActionMock.insertEventRecord(event, EventStatus.inPayment);
  await db.insertNewTx(tx, await db.getEventById(eventId), 2, null, approval);
  const row = (await db.getTxById(tx.txId))!;
  const enc = new ECDSA('0b'.padStart(64, '0'));
  const pk = await enc.getPk();
  const guardKeys = [pk];
  const shares = ['1'];
  if (twoGuards) {
    guardKeys.push(await approvalKeys[0].getPk());
    shares.push('2');
  }
  const submit = vi.fn();
  const guards = [{ publicKey: pk, peerId: 'synthetic-peer', index: 0 }];
  const detection = new GuardDetection({
    messageEnc: enc,
    guardsPublicKey: guardKeys,
    submit,
    getPeerId: async () => 'synthetic-peer',
  });
  vi.spyOn(detection, 'activeGuards').mockResolvedValue(guards);
  const signer = new InspectableSigner({
    messageEnc: enc,
    guardsPk: guardKeys,
    shares,
    detection,
    submitMsg: submit,
    tssApiUrl: '',
    callbackUrl: '',
    getPeerId: async () => 'synthetic-peer',
    turnNoWorkSeconds: 0.001,
  });
  vi.spyOn(signer, 'getGuardTurn').mockReturnValue(0);
  vi.spyOn(signer.api(), 'get').mockResolvedValue({ data: { threshold: 0 } });
  const post = vi
    .spyOn(signer.api(), 'post')
    .mockImplementation(async (url) => ({
      data: url === 'getPK' ? { publicKey: signature.publicKey } : {},
    }));
  InstalledHandler.install(signer);
  Configs.tssKeys = {
    encryptor: enc,
    pubs: guardKeys.map((curvePub, i) => ({
      curvePub,
      curveShareId: shares[i],
      edwardShareId: shares[i],
    })),
  };
  const bound = new InstalledHandler().wrapBoundCurveSigner(
    signature.chainCode,
    signature.derivationPath,
  );
  const previous = block.transactions.find(
    (t) => t.txid === withdrawal.prevout.txid,
  )!;
  const info = {
    chain: 'test',
    blocks: 106,
    bestblockhash: block.block.hash,
    consensus: {
      chaintip: withdrawal.expected_branch_id,
      nextblock: withdrawal.expected_branch_id,
    },
  };
  const state = { available: true, reads: 0 };
  const evidence = new ZcashPaymentEvidence(
    {
      getGenesisHash: async () => {
        state.reads++;
        return genesis;
      },
      getBlockchainInfo: async () => structuredClone(info),
      getTxOut: async () =>
        state.available
          ? {
              bestblock: block.block.hash,
              confirmations: 1,
              value: '1.00000000',
              scriptPubKey: { hex: withdrawal.prevout.script_pubkey_hex },
              version: 5,
              coinbase: false,
            }
          : null,
      getBlockHash: async () => block.block.hash,
      getTransaction: async () => ({
        ...structuredClone(previous),
        confirmations: 1,
        in_active_chain: true,
      }),
    },
    inspector,
    {
      network: 'regtest',
      genesisHash: genesis,
      sourceId: 'guard-local-fixture',
      branches: [{ height: 0, branchId: withdrawal.expected_branch_id }],
      minimumConfirmations: 1,
      maximumExpiryDelta: 200,
    },
  );
  const policy: ZcashNativeSigningPolicy = {
    network: 'regtest',
    genesisHash: genesis,
    sourceId: 'guard-local-fixture',
    reserveAddress: reserve,
    chainCode: signature.chainCode,
    derivationPath: signature.derivationPath,
    publicKey: signature.publicKey,
    protocolVersion: '6.0.1',
    effectiveThreshold: 1,
    guardPublicKeys: guardKeys,
    shareIds: shares,
    maxObservationAgeMs: 5000,
    feeFloorZat: 10000n,
    maximumFeeZat: 10000n,
    minimumOutputZat: 1n,
  };
  let clock = 100;
  let closing = false;
  const lifecycles: Lifecycle[] = [];
  const capability = new ZcashNativeSigningCapability(
    native,
    inspector,
    evidence,
    bound,
    () => {
      if (closing) throw Error('Native signing fixture is closing');
      return policy;
    },
    () => clock,
  );
  const coordinator = new ZcashSigningCoordinator(
    db.dataSource,
    capability,
    () => approvalPolicy,
    approvalKeys[0],
  );
  const store = new ZcashSigningAttemptStore(db.dataSource);
  const authority = await new ZcashEventPaymentAuthority(db.dataSource).capture(
    eventId,
  );
  let closed: Promise<void> | undefined;
  const quiesce = () => {
    closing = true;
    return closed ??= bounded((async () => {
      while (lifecycles.some((operation) => !operation.settled)) {
        for (const queued of signer.queue()) {
          if (queued.boundSettled) continue;
          if (queued.boundBackendAttempted) {
            // Only the controlled backend is used in this file. Settle through its real failure callback.
            await signer.handleSignData(StatusEnum.Failed, queued.msg, undefined, undefined, 'Fixture cleanup');
          } else {
            // The revoked policy refuses through the real bound gate before any transport.
            try { await signer.update(); } catch { /* completion below owns durable cleanup */ }
          }
        }
        if (lifecycles.some((operation) => !operation.settled)) await new Promise((resolve) => setTimeout(resolve, 10));
      }
    })(), quiescenceTimeoutMs, 'Native signing fixture did not become quiescent; SQLite cleanup blocked');
  };
  fixtureCleanup.push(quiesce);
  const start = async () => {
    const operation: Lifecycle = { settled: false, rejected: false };
    lifecycles.push(operation);
    const starting = coordinator.start(row);
    // Attach before awaiting startup so even a test deadline cannot orphan durable work.
    void starting.then((task) => task.completion).then(
      () => { operation.settled = true; },
      (error) => { operation.error = error; operation.rejected = true; operation.settled = true; },
    );
    const task = await starting;
    const deadline = performance.now() + readinessTimeoutMs;
    for (;;) {
      if (operation.rejected) throw operation.error;
      if (operation.settled) throw Error('Signing completed before fixture enqueue');
      if (signer.queue().length > 0) { expect(signer.queue()).toHaveLength(1); break; }
      if (performance.now() >= deadline) throw Error('Native signing fixture enqueue deadline exceeded');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return task;
  };
  const finish = () =>
    signer.handleSignData(
      StatusEnum.Success,
      signature.digest,
      signature.signature,
      signature.signatureRecovery,
    );
  return {
    tx,
    intent,
    authority,
    tokenMap,
    feePolicy,
    row,
    db,
    store,
    signer,
    enc,
    submit,
    post,
    guards,
    state,
    policy,
    approvalPolicy,
    capability,
    evidence,
    coordinator,
    quiesce,
    start,
    finish,
    tick: (milliseconds: number) => {
      clock += milliseconds;
    },
  };
}

describe('native guard to bound TSS join', () => {
  describe('fixture readiness and quiescence', () => {
    it('waits for actual durable initialization beyond the default one-second poll deadline', async () => {
      const f = await fixture();
      const original = ZcashSigningAttemptStore.prototype.markMayDispatch;
      vi.spyOn(ZcashSigningAttemptStore.prototype, 'markMayDispatch').mockImplementation(async function (this: ZcashSigningAttemptStore, ...args) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return original.apply(this, args);
      });
      const began = performance.now(), task = await f.start();
      expect(performance.now() - began).toBeGreaterThanOrEqual(1200);
      expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
      f.state.available = false;
      await expect(f.signer.update()).rejects.toThrow(/unavailable_prevout/);
      await expect(task.completion).rejects.toBeTypeOf('string');
      expect(f.post.mock.calls.filter(([url]) => url === 'sign')).toHaveLength(0);
    });

    it('propagates the original completion rejection instead of masking it as queue timeout', async () => {
      const f = await fixture(), failure = Error('isolated initialization rejection');
      vi.spyOn(ZcashSigningAttemptStore.prototype, 'markMayDispatch').mockRejectedValue(failure);
      await expect(f.start()).rejects.toBe(failure);
      await f.quiesce();
      expect(f.signer.queue()).toHaveLength(0);
      expect(await f.store.getActive(f.tx.txId)).toBeNull();
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(TransactionStatus.approved);
    });

    it('quiesces a timed-out pending initialization before shared SQLite can be cleared', async () => {
      const f = await fixture();
      let release!: () => void, entered!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const paused = new Promise<void>((resolve) => { entered = resolve; });
      const original = ZcashSigningAttemptStore.prototype.markMayDispatch;
      vi.spyOn(ZcashSigningAttemptStore.prototype, 'markMayDispatch').mockImplementation(async function (this: ZcashSigningAttemptStore, ...args) {
        entered(); await gate; return original.apply(this, args);
      });
      const starting = f.start();
      await paused;
      await expect(starting).rejects.toThrow('fixture enqueue deadline exceeded');
      let settled = false;
      const closing = f.quiesce().then(() => { settled = true; });
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(settled).toBe(false);
      release(); await closing;
      expect(f.signer.queue()).toHaveLength(0);
      expect(f.post.mock.calls.filter(([url]) => url === 'sign')).toHaveLength(0);
      expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
    });
  });
  describe('event payment authority', () => {
    it.each(['recipient', 'amount'] as const)(
      'rejects a canonically valid proposal with a different %s',
      async (field) => {
        const f = await fixture();
        const other = f.tx.getIntent();
        if (field === 'recipient') other.payments[0].address = reserve;
        else other.payments[0].assets.nativeToken += 1n;
        const proposal = ZcashTransaction.create(other, native, inspector);
        await expect(
          f.capability.prepareApprovedSigning(proposal.toJson(), f.authority),
        ).rejects.toThrow('intent_join');
        expect(
          f.post.mock.calls.filter(([url]) => url === 'getPK'),
        ).toHaveLength(0);
        expect(f.signer.queue()).toHaveLength(0);
      },
    );

    it('rejects an object imitating an issued event authority', async () => {
      const f = await fixture();
      await expect(
        f.capability.prepareApprovedSigning(f.tx.toJson(), { ...f.authority }),
      ).rejects.toThrow('unknown snapshot');
      expect(f.state.reads).toBe(0);
    });

    it.each([
      [
        'fee ceiling',
        (p: ZcashNativeSigningPolicy) => {
          p.feeFloorZat = 0n;
          p.maximumFeeZat = 9999n;
        },
      ],
      [
        'fee floor',
        (p: ZcashNativeSigningPolicy) => {
          p.feeFloorZat = 10001n;
          p.maximumFeeZat = 20000n;
        },
      ],
      [
        'minimum payment output',
        (p: ZcashNativeSigningPolicy) => {
          p.minimumOutputZat = 40000001n;
        },
      ],
    ] as const)('rejects payment outside trusted %s', async (_name, mutate) => {
      const f = await fixture();
      mutate(f.policy);
      await expect(
        f.capability.prepareApprovedSigning(f.tx.toJson(), f.authority),
      ).rejects.toThrow('event or fee policy');
      expect(f.signer.queue()).toHaveLength(0);
    });

    it('rejects an inflated fee with change even inside the absolute ceiling', async () => {
      const f = await fixture();
      f.policy.maximumFeeZat = 20000n;
      const proposal = ZcashTransaction.create(
        { ...f.intent, feeZat: 15000n },
        native,
        inspector,
      );
      await expect(
        f.capability.prepareApprovedSigning(proposal.toJson(), f.authority),
      ).rejects.toThrow('event or fee policy');
      expect(f.signer.queue()).toHaveLength(0);
    });

    it('allows a qualified no-change transaction at its fee ceiling', async () => {
      const f = await fixture();
      const raw = (await f.db.getEventById(f.tx.eventId))!.eventData;
      raw.amount = '99987000';
      await f.db.dataSource.getRepository(raw.constructor).save(raw);
      const authority = await new ZcashEventPaymentAuthority(
        f.db.dataSource,
      ).capture(f.tx.eventId);
      f.policy.maximumFeeZat = 15000n;
      const proposal = ZcashTransaction.create(
        { ...f.intent, payments: authority.payments, feeZat: 15000n },
        native,
        inspector,
      );
      const prepared = await f.capability.prepareApprovedSigning(
        proposal.toJson(),
        authority,
      );
      expect(prepared.inputs.sighashAll).toBe(proposal.getDigest().sighash_all);
      expect(f.signer.queue()).toHaveLength(0);
    });

    it('rejects a change output below the trusted minimum', async () => {
      const f = await fixture();
      const raw = (await f.db.getEventById(f.tx.eventId))!.eventData;
      raw.amount = '99991999';
      await f.db.dataSource.getRepository(raw.constructor).save(raw);
      const authority = await new ZcashEventPaymentAuthority(
        f.db.dataSource,
      ).capture(f.tx.eventId);
      f.policy.minimumOutputZat = 2n;
      const proposal = ZcashTransaction.create(
        { ...f.intent, payments: authority.payments },
        native,
        inspector,
      );
      await expect(
        f.capability.prepareApprovedSigning(proposal.toJson(), authority),
      ).rejects.toThrow('event or fee policy');
      expect(f.signer.queue()).toHaveLength(0);
    });

    it.each([
      ['kind', 'other'],
      ['genesisHash', 'ab'.repeat(32)],
      ['sourceId', 'other-source'],
      ['network', 'testnet'],
      ['candidateSha256', 'ab'.repeat(32)],
      ['outpoint', withdrawal.prevout.txid + ':1'],
      ['candidateBranchId', 'c8e71055'],
      ['amountZat', '100000001'],
      ['scriptPubKeyHex', '76a914' + 'ab'.repeat(20) + '88ac'],
    ] as const)(
      'rejects wrong preparation receipt %s before asking TSS for a profile',
      async (field, value) => {
        const f = await fixture();
        const prototype = Object.getPrototypeOf(
          f.evidence,
        ) as ZcashPaymentEvidence;
        const check = prototype.check;
        vi.spyOn(prototype, 'check').mockImplementation(async function (
          this: ZcashPaymentEvidence,
          transaction,
        ) {
          return { ...(await check.call(this, transaction)), [field]: value };
        });
        await expect(
          f.capability.prepareApprovedSigning(f.tx.toJson(), f.authority),
        ).rejects.toThrow('preparation source observation mismatch');
        expect(
          f.post.mock.calls.filter(([url]) => url === 'getPK'),
        ).toHaveLength(0);
      },
    );

    it('rejects fee configuration changed while a request is queued', async () => {
      const f = await fixture();
      const task = await f.start();
      f.feePolicy.bridgeFee += 1n;
      await expect(f.signer.update()).rejects.toThrow('policy changed');
      await expect(task.completion).rejects.toBeTypeOf('string');
      expect(f.submit).not.toHaveBeenCalled();
      expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
    });
  });
  describe('capability negative matrix', () => {
    it.each([
      [
        'protocol',
        (p: ZcashNativeSigningPolicy) => {
          p.protocolVersion = 'other';
        },
      ],
      [
        'chainCode',
        (p: ZcashNativeSigningPolicy) => {
          p.chainCode = 'ab'.repeat(16);
        },
      ],
      [
        'path',
        (p: ZcashNativeSigningPolicy) => {
          p.derivationPath = [1];
        },
      ],
      [
        'publicKey',
        (p: ZcashNativeSigningPolicy) => {
          p.publicKey = p.guardPublicKeys[0];
        },
      ],
      [
        'threshold',
        (p: ZcashNativeSigningPolicy) => {
          p.effectiveThreshold = 2;
        },
      ],
      [
        'ordered guards',
        (p: ZcashNativeSigningPolicy) => {
          p.guardPublicKeys = [...p.guardPublicKeys].reverse();
        },
      ],
      [
        'ordered shares',
        (p: ZcashNativeSigningPolicy) => {
          p.shareIds = [...p.shareIds].reverse();
        },
      ],
    ] as const)(
      'refuses a trusted %s policy differing from the issued profile',
      async (_name, mutate) => {
        const f = await fixture(true);
        mutate(f.policy);
        await expect(
          f.capability.prepareApprovedSigning(f.tx.toJson(), f.authority),
        ).rejects.toThrow('Zcash TSS profile differs from trusted policy');
        expect(f.signer.queue()).toHaveLength(0);
        expect(f.submit).not.toHaveBeenCalled();
        expect(
          f.post.mock.calls.filter(([url]) => url === 'sign'),
        ).toHaveLength(0);
      },
    );

    it('refuses a coherent issued profile whose key does not control the reserve', async () => {
      const f = await fixture();
      const otherPublicKey = await f.enc.getPk();
      f.policy.publicKey = otherPublicKey;
      f.post.mockImplementation(async (url) => ({
        data: url === 'getPK' ? { publicKey: otherPublicKey } : {},
      }));
      await expect(
        f.capability.prepareApprovedSigning(f.tx.toJson(), f.authority),
      ).rejects.toThrow('Zcash reserve does not match the signing key');
      expect(f.signer.queue()).toHaveLength(0);
    });

    it('refuses an already native-signed proposal at preparation', async () => {
      const f = await fixture();
      const signed = f.tx.finalize(
        signature.signature,
        signature.publicKey,
        native,
        inspector,
      );
      await expect(
        f.capability.prepareApprovedSigning(signed.toJson(), f.authority),
      ).rejects.toThrow(
        'Zcash preparation requires an unsigned payment under the reserve policy',
      );
      expect(f.signer.queue()).toHaveLength(0);
    });

    it.each([
      ['kind', 'other'],
      ['genesisHash', 'ab'.repeat(32)],
      ['sourceId', 'other-source'],
      ['network', 'testnet'],
      ['candidateSha256', 'ab'.repeat(32)],
      ['outpoint', withdrawal.prevout.txid + ':1'],
      ['candidateBranchId', 'c8e71055'],
      ['amountZat', '100000001'],
      ['scriptPubKeyHex', '76a914' + 'ab'.repeat(20) + '88ac'],
      ['previousBlockHash', 'ab'.repeat(32)],
      ['previousHeight', 105],
      ['previousBranchId', 'c8e71055'],
    ] as const)(
      'refuses changed source receipt %s after the initial real receipt',
      async (field, value) => {
        const f = await fixture();
        const task = await f.start();
        const prototype = Object.getPrototypeOf(
          f.evidence,
        ) as ZcashPaymentEvidence;
        const check = prototype.check;
        const wrapped = vi
          .spyOn(prototype, 'check')
          .mockImplementation(async function (
            this: ZcashPaymentEvidence,
            transaction,
          ) {
            return { ...(await check.call(this, transaction)), [field]: value };
          });
        await expect(f.signer.update()).rejects.toThrow(
          field.startsWith('previous')
            ? 'Zcash dispatch previous transaction context changed'
            : 'Zcash dispatch source observation mismatch',
        );
        await expect(task.completion).rejects.toBeTypeOf('string');
        expect(wrapped).toHaveBeenCalledOnce();
        expect(f.submit).not.toHaveBeenCalled();
        expect(
          f.post.mock.calls.filter(([url]) => url === 'sign'),
        ).toHaveLength(0);
        expect((await f.store.getActive(f.tx.txId))!.state).toBe(
          'may_dispatch',
        );
      },
    );

    it.each([
      'signer instance',
      'configured shares',
      'native policy',
      'event fee',
    ] as const)(
      'refuses %s drift across the awaited durable authorization',
      async (field) => {
        const f = await fixture();
        const task = await f.start();
        const current =
          ZcashSigningAttemptStore.prototype.assertMayDispatchCurrent;
        vi.spyOn(
          ZcashSigningAttemptStore.prototype,
          'assertMayDispatchCurrent',
        ).mockImplementation(async function (
          this: ZcashSigningAttemptStore,
          id,
          binding,
          authority,
        ) {
          await current.call(this, id, binding, authority);
          if (field === 'signer instance')
            InstalledHandler.install(Object.create(f.signer) as EcdsaSigner);
          else if (field === 'configured shares')
            Configs.tssKeys.pubs[0].curveShareId = 'other';
          else if (field === 'event fee') f.feePolicy.bridgeFee += 1n;
          else f.policy.sourceId = 'other-source';
        });
        await expect(f.signer.update()).rejects.toThrow(
          field === 'native policy'
            ? 'Zcash signing policy changed'
            : field === 'event fee'
              ? 'policy changed'
              : 'Bound ECDSA signer configuration changed',
        );
        await expect(task.completion).rejects.toBeTypeOf('string');
        expect(f.submit).not.toHaveBeenCalled();
        expect(
          f.post.mock.calls.filter(([url]) => url === 'sign'),
        ).toHaveLength(0);
      },
    );

    it('refuses issued session reuse and dispatch authorization after terminal rejection', async () => {
      const original =
        ZcashNativeSigningCapability.prototype.signApprovedTransaction;
      let issued!: Parameters<
        ZcashNativeSigningCapability['signApprovedTransaction']
      >;
      vi.spyOn(
        ZcashNativeSigningCapability.prototype,
        'signApprovedTransaction',
      ).mockImplementation(function (
        this: ZcashNativeSigningCapability,
        ...args
      ) {
        issued = args;
        return original.apply(this, args);
      });
      const f = await fixture();
      const task = await f.start();
      await expect(
        f.capability.signApprovedTransaction(...issued),
      ).rejects.toThrow('Zcash prepared signing session was already used');
      f.state.available = false;
      await expect(f.signer.update()).rejects.toThrow(/unavailable_prevout/);
      await expect(task.completion).rejects.toBeTypeOf('string');
      f.state.available = true;
      expect(() => issued[3].assertCurrent()).toThrow(
        'Zcash signing attempt is not dispatchable',
      );
      const receipt = await f.evidence.check(f.tx);
      await expect(
        issued[3].authorize({
          ...issued[2].inputs,
          candidateSha256: receipt.candidateSha256,
        }),
      ).rejects.toThrow('Zcash signing attempt is not dispatchable');
      expect(f.submit).not.toHaveBeenCalled();
      expect(f.post.mock.calls.filter(([url]) => url === 'sign')).toHaveLength(
        0,
      );
      expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
    });
  });

  it('checks several stages, marks once and persists native validated signed bytes', async () => {
    const f = await fixture();
    const mark = vi.spyOn(
      ZcashSigningAttemptStore.prototype,
      'markMayDispatch',
    );
    const current = vi.spyOn(
      ZcashSigningAttemptStore.prototype,
      'assertMayDispatchCurrent',
    );
    const task = await f.start();
    await f.signer.update();
    await f.signer.startSign(signature.digest, f.guards);
    expect(mark).toHaveBeenCalledTimes(1);
    expect(current).toHaveBeenCalledTimes(2);
    expect(f.submit).toHaveBeenCalledTimes(1);
    expect(f.post.mock.calls.filter((c) => c[0] === 'sign')).toHaveLength(1);
    await f.finish();
    await task.completion;
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
    const saved = (await f.db.getTxById(f.tx.txId))!;
    expect(saved.status).toBe(TransactionStatus.signed);
    expect(
      ZcashTransaction.fromJson(
        saved.txJson,
        f.intent,
        native,
        inspector,
      ).getSignedHex(),
    ).toBeDefined();
  });

  it.each([EventStatus.rejected, EventStatus.spent])(
    'blocks event %s while the request envelope is paused and retains custody',
    async (status) => {
      const f = await fixture();
      const task = await f.start();
      let release!: () => void, entered!: () => void;
      const paused = new Promise<void>((r) => {
        entered = r;
      });
      const wait = new Promise<void>((r) => {
        release = r;
      });
      const original = f.enc.sign.bind(f.enc);
      vi.spyOn(f.enc, 'sign').mockImplementation(async (value) => {
        entered();
        await wait;
        return original(value);
      });
      const update = f.signer.update();
      await paused;
      await f.db.setEventStatus(f.tx.eventId, status);
      release();
      await expect(update).rejects.toThrow(/conflict/);
      await expect(task.completion).rejects.toBeTypeOf('string');
      expect(f.submit).not.toHaveBeenCalled();
      expect(f.post.mock.calls.filter((c) => c[0] === 'sign')).toHaveLength(0);
      expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
      expect((await f.db.getTxById(f.tx.txId))!.signingAttemptId).toBe(
        task.attemptId,
      );
    },
  );

  it('refreshes source evidence again after enqueue and refuses a spent reserve output', async () => {
    const f = await fixture();
    const task = await f.start();
    f.state.available = false;
    await expect(f.signer.update()).rejects.toThrow(/unavailable_prevout/);
    await expect(task.completion).rejects.toBeTypeOf('string');
    expect(f.submit).not.toHaveBeenCalled();
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('may_dispatch');
  });

  it('expires a source observation during the durable authorization await', async () => {
    const f = await fixture();
    const task = await f.start();
    const original =
      ZcashSigningAttemptStore.prototype.assertMayDispatchCurrent;
    vi.spyOn(
      ZcashSigningAttemptStore.prototype,
      'assertMayDispatchCurrent',
    ).mockImplementation(async function (
      this: ZcashSigningAttemptStore,
      id,
      binding,
      authority,
    ) {
      await original.call(this, id, binding, authority);
      f.tick(5001);
    });
    await expect(f.signer.update()).rejects.toThrow(/expired/);
    await expect(task.completion).rejects.toBeTypeOf('string');
    expect(f.submit).not.toHaveBeenCalled();
  });

  it('rejects configured policy drift after the DB await', async () => {
    const f = await fixture();
    const task = await f.start();
    const original =
      ZcashSigningAttemptStore.prototype.assertMayDispatchCurrent;
    vi.spyOn(
      ZcashSigningAttemptStore.prototype,
      'assertMayDispatchCurrent',
    ).mockImplementation(async function (
      this: ZcashSigningAttemptStore,
      id,
      binding,
      authority,
    ) {
      await original.call(this, id, binding, authority);
      f.approvalPolicy.requiredSign = 3;
    });
    await expect(f.signer.update()).rejects.toThrow(/policy mismatch/);
    await expect(task.completion).rejects.toBeTypeOf('string');
    expect(f.submit).not.toHaveBeenCalled();
  });

  it('retains a valid native result after an already dispatched event is revoked', async () => {
    const f = await fixture();
    const task = await f.start();
    await f.signer.startSign(signature.digest, f.guards);
    await f.db.setEventStatus(f.tx.eventId, EventStatus.rejected);
    await f.finish();
    await task.completion;
    expect((await f.store.getActive(f.tx.txId))!.state).toBe('signed');
    expect((await f.db.getEventById(f.tx.eventId))!.status).toBe(
      EventStatus.rejected,
    );
  });

  it('rejects a forged prepared session before native dispatch', async () => {
    const f = await fixture();
    const prepared = await f.capability.prepareApprovedSigning(
      f.tx.toJson(),
      f.authority,
    );
    const gate = vi.fn(async () => {});
    await expect(
      f.capability.signApprovedTransaction(
        f.tx.toJson(),
        gate,
        JSON.parse(JSON.stringify(prepared)),
        { authorize: async () => {}, assertCurrent: () => {} },
      ),
    ).rejects.toThrow(/Unknown/);
    expect(gate).not.toHaveBeenCalled();
    expect(f.signer.queue()).toHaveLength(0);
  });
});
