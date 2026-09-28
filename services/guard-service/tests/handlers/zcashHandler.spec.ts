import { Communicator } from '@rosen-bridge/communication';
import { GuardDetection } from '@rosen-bridge/detection';
import { ECDSA } from '@rosen-bridge/encryption';
import { TokenMap } from '@rosen-bridge/tokens';
import { EcdsaSigner, StatusEnum } from '@rosen-bridge/tss';
import {
  PaymentTransaction,
  ConfirmationStatus,
  SigningStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { ZcashTransaction } from '@rosen-chains/zcash-payment';

import {
  calculateApprovalHash,
  createTransactionApproval,
} from '../../src/agreement/transactionApproval';
import TxAgreement from '../../src/agreement/txAgreement';
import Configs from '../../src/configs/configs';
import { parseZcashGuardConfig } from '../../src/configs/guardsZcashConfigs';
import { DatabaseAction } from '../../src/db/databaseAction';
import { ZcashSettlementEntity } from '../../src/db/entities/zcashSettlementEntity';
import { ZcashSigningAttemptEntity } from '../../src/db/entities/zcashSigningAttemptEntity';
import { ZcashBroadcastStore } from '../../src/db/zcashBroadcastStore';
import EventOrder from '../../src/event/eventOrder';
import EventProcessor from '../../src/event/eventProcessor';
import EventSerializer from '../../src/event/eventSerializer';
import ChainHandler from '../../src/handlers/chainHandler';
import GuardPkHandler from '../../src/handlers/guardPkHandler';
import MinimumFeeHandler from '../../src/handlers/minimumFeeHandler';
import { TokenHandler } from '../../src/handlers/tokenHandler';
import TssHandler from '../../src/handlers/tssHandler';
import { createZcashGuardRuntime } from '../../src/handlers/zcashHandler';
import TransactionProcessor from '../../src/transaction/transactionProcessor';
import { ZcashBroadcastCoordinator } from '../../src/transaction/zcashBroadcastCoordinator';
import {
  decodeZcashSettlementReceipt,
  encodeZcashSettlementReceipt,
} from '../../src/transaction/zcashConfirmationAuthority';
import { ZcashRewardEligibility } from '../../src/transaction/zcashRewardEligibility';
import { ZcashSigningCoordinator } from '../../src/transaction/zcashSigningCoordinator';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import GuardTurn from '../../src/utils/guardTurn';
import RequestVerifier from '../../src/verification/requestVerifier';
import TransactionVerifier from '../../src/verification/transactionVerifier';
import { mockPaymentTransaction } from '../agreement/testData';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockEventTrigger } from '../event/testData';
import TestConfigs from '../testUtils/testConfigs';
import block from '../transaction/zcashFixtures/payment-evidence-block-106.json' with { type: 'json' };
import signature from '../transaction/zcashFixtures/tss-signature.json' with { type: 'json' };
import withdrawal from '../transaction/zcashFixtures/withdrawal-input.json' with { type: 'json' };

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw Error(`${name} is required`);
  return value;
};

const genesis =
  '029f11d80ef9765602235e1bc9727e3eb6ba20839319f761fee920d63401e327';
const reserve = 'tmXebSxnVN4HGSTK4icB4i3FitWjNv5u6pt';
const payout = 'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs';
const approvalKeys = [1, 2, 3].map(
  (i) => new ECDSA(i.toString(16).padStart(64, '0')),
);
const savedKeys = Configs.tssKeys;
const savedApprovalKeys = TestConfigs.guardPublicKeys;
const savedThreshold = TestConfigs.requiredSigns;

class InspectableSigner extends EcdsaSigner {
  api = () => this.axios;
  queue = () => this.signs;
}

class InstalledHandler extends TssHandler {
  constructor() {
    super();
  }

  static install(signer: EcdsaSigner): void {
    TssHandler.tssCurveSigner = signer;
  }
}

type RpcRequest = {
  jsonrpc: string;
  id: number;
  method: string;
  params: unknown[];
};

const rawConfig = () => ({
  enabled: true,
  rpc: {
    rpcUrl: 'http://127.0.0.1:18232/',
    auth: { username: 'guard', password: 'local-secret' },
    timeoutMs: 10_000,
    maxResponseBytes: 64 * 1024 * 1024,
  },
  sourcePolicy: {
    network: 'regtest',
    genesisHash: genesis,
    sourceId: 'guard-local-fixture',
    branches: [{ height: 0, branchId: withdrawal.expected_branch_id }],
    minimumConfirmations: 1,
    maximumExpiryDelta: 200,
  },
  native: {
    executablePath: env('ZCASH_PAYMENT_BIN'),
    expectedSha256: env('ZCASH_PAYMENT_SHA256'),
  },
  inspector: {
    executablePath: env('ZCASH_INSPECTOR_BIN'),
    expectedSha256: env('ZCASH_INSPECTOR_SHA256'),
  },
  chain: {
    addresses: {
      lock: reserve,
      cold: '',
      permit: 'permit-address',
      fraud: 'fraud-address',
    },
    rwtId: 'cd'.repeat(32),
    confirmations: {
      observation: 1,
      payment: 1,
      cold: 1,
      manual: 1,
      arbitrary: 1,
    },
  },
  payment: {
    feeFloorZat: '10000',
    maximumFeeZat: '10000',
    minimumOutputZat: '1000',
    expiryDelta: 200,
  },
  signing: {
    publicKey: signature.publicKey,
    chainCode: signature.chainCode,
    derivationPath: signature.derivationPath,
    effectiveThreshold: 1,
    protocolVersion: '6.0.1',
    maxObservationAgeMs: 5_000,
  },
});

beforeEach(async () => {
  await DatabaseActionMock.clearTables();
});

afterEach(() => {
  Configs.tssKeys = savedKeys;
  TestConfigs.guardPublicKeys = savedApprovalKeys;
  TestConfigs.requiredSigns = savedThreshold;
  vi.restoreAllMocks();
});

async function fixture() {
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

  const previous = block.transactions.find(
    (transaction) => transaction.txid === withdrawal.prevout.txid,
  )!;
  let proposalTxId = '';
  const source = {
    available: true,
    remoteHex: undefined as string | undefined,
    confirmed: false,
    lostResponse: false,
    failBeforeAcceptance: false,
    wrongSubmitId: false,
    lookupFailure: false,
    contradictMempool: false,
    sends: [] as string[],
    beforeLookup: undefined as (() => Promise<void>) | undefined,
  };
  const rpcMethods: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (
      _input: string | URL | Request,
      init?: Parameters<typeof globalThis.fetch>[1],
    ) => {
      if (typeof init?.body !== 'string') throw Error('missing RPC body');
      expect(new Headers(init.headers).get('authorization')).toBe(
        `Basic ${Buffer.from('guard:local-secret').toString('base64')}`,
      );
      const request = JSON.parse(init.body) as RpcRequest;
      rpcMethods.push(request.method);
      let result: unknown;
      switch (request.method) {
        case 'getblockhash':
          result = request.params[0] === 0 ? genesis : block.block.hash;
          break;
        case 'getblockchaininfo':
          result = {
            chain: 'test',
            blocks: 106,
            bestblockhash: block.block.hash,
            consensus: {
              chaintip: withdrawal.expected_branch_id,
              nextblock: withdrawal.expected_branch_id,
            },
          };
          break;
        case 'getaddressutxos':
          result = {
            utxos: [
              {
                address: reserve,
                txid: withdrawal.prevout.txid,
                outputIndex: withdrawal.prevout.vout,
                script: withdrawal.prevout.script_pubkey_hex,
                satoshis: Number(withdrawal.prevout.amount_zat),
                height: 106,
              },
            ],
            hash: block.block.hash,
            height: 106,
          };
          break;
        case 'gettxout':
          result = source.available
            ? {
                bestblock: block.block.hash,
                confirmations: 1,
                value: 1,
                scriptPubKey: { hex: withdrawal.prevout.script_pubkey_hex },
                version: 5,
                coinbase: false,
              }
            : null;
          break;
        case 'getrawtransaction':
          if (request.params[0] === withdrawal.prevout.txid) {
            result = {
              ...structuredClone(previous),
              confirmations: 1,
              in_active_chain: true,
            };
          } else {
            if (source.beforeLookup) await source.beforeLookup();
            if (source.lookupFailure) throw Error('controlled lookup outage');
            if (source.remoteHex === undefined)
              return new Response(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: request.id,
                  error: {
                    code: -5,
                    message: 'Transaction not found in mempool or best chain',
                  },
                }),
                { status: 200 },
              );
            result = {
              txid: proposalTxId,
              hex: source.remoteHex,
              size: source.remoteHex.length / 2,
              in_active_chain: source.confirmed,
              ...(source.confirmed
                ? { blockhash: block.block.hash, height: 106, confirmations: 1 }
                : {}),
            };
          }
          break;
        case 'getblock':
          result = {
            hash: block.block.hash,
            previousblockhash: 'ab'.repeat(32),
            height: 106,
            confirmations: 1,
            nTx: 1,
            tx: [proposalTxId],
          };
          break;
        case 'getrawmempool':
          result =
            source.remoteHex !== undefined || source.contradictMempool
              ? { [proposalTxId]: {} }
              : {};
          break;
        case 'sendrawtransaction': {
          const row =
            (await DatabaseAction.getInstance().getTxById(proposalTxId))!;
          expect(row.status).toBe(TransactionStatus.sent);
          const signedHex = (
            createZcashGuardRuntime(
              parseZcashGuardConfig(rawConfig())!,
              tokenMap,
            ).chain.PaymentTransactionFromJson(row.txJson) as ZcashTransaction
          ).getSignedHex();
          expect(request.params[0]).toBe(signedHex);
          source.sends.push(request.params[0] as string);
          if (source.failBeforeAcceptance)
            throw Error('controlled pre-acceptance transport failure');
          source.remoteHex = request.params[0] as string;
          source.available = false;
          if (source.lostResponse)
            throw Error('controlled accepted response loss');
          result = source.wrongSubmitId ? '00'.repeat(32) : proposalTxId;
          break;
        }
        default:
          throw Error(`unexpected RPC method ${request.method}`);
      }
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: request.id, result }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  );

  const config = parseZcashGuardConfig(rawConfig());
  if (!config) throw Error('enabled Zcash config was not parsed');
  const runtime = createZcashGuardRuntime(config, tokenMap);
  vi.spyOn(TokenHandler.getInstance(), 'getTokenMap').mockReturnValue(tokenMap);
  const feePolicy = {
    bridgeFee: 2_000n,
    networkFee: 1_000n,
    rsnRatio: 0n,
    rsnRatioDivisor: 1n,
    feeRatio: 0n,
    feeRatioDivisor: 1n,
  };
  vi.spyOn(MinimumFeeHandler, 'getEventFeeConfig').mockReturnValue(feePolicy);
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: () => runtime.chain,
    getZcashBroadcastCapability: () => runtime.getBroadcastCapability(),
  } as unknown as ChainHandler);

  const event = mockEventTrigger().event;
  event.fromChain = 'ergo';
  event.sourceChainTokenId = 'ab'.repeat(32);
  event.toChain = 'zcash';
  event.targetChainTokenId = 'zec';
  event.toAddress = payout;
  event.amount = (BigInt(withdrawal.amount_zat) + 2_000n).toString();
  event.bridgeFee = '0';
  event.networkFee = '0';
  const eventId = EventSerializer.getId(event);
  const payment = EventOrder.eventSinglePayment(
    event,
    runtime.chain.getMinimumNativeToken(),
    feePolicy,
  );
  expect(payment.assets.nativeToken).toBe(BigInt(withdrawal.amount_zat));
  const tx = await runtime.chain.generateTransaction(
    eventId,
    TransactionType.payment,
    [payment],
    [],
    [],
  );
  expect(tx).toBeInstanceOf(ZcashTransaction);
  const model = tx as ZcashTransaction;
  proposalTxId = model.txId;
  expect(model.getIntent().expiryHeight).toBe(306);
  expect(model.getDigest().sighash_all).toBe(signature.digest);

  const approvalPolicy = {
    protocolVersion: '1.0.0' as const,
    guardPublicKeys: await Promise.all(approvalKeys.map((key) => key.getPk())),
    requiredSign: 2,
  };
  const signs = await Promise.all(
    approvalKeys.map((key, index) =>
      key.sign(
        Communicator.generatePayloadToSign(
          { txDataHash: calculateApprovalHash(tx.toJson()) },
          1_700_000_000,
          approvalPolicy.guardPublicKeys[index],
          '1.0.0',
        ),
      ),
    ),
  );
  signs[2] = '';
  const approval = createTransactionApproval(
    tx.toJson(),
    1_700_000_000,
    signs,
    approvalPolicy,
  );
  const db = DatabaseAction.getInstance();
  await DatabaseActionMock.insertEventRecord(event, EventStatus.inPayment);
  const trigger = (await db.getEventById(eventId))!.eventData;
  await db.EventRepository.update(
    { id: trigger.id },
    {
      serialized: Buffer.from('retained-ergo-trigger').toString('base64'),
      spendHeight: null,
      spendBlock: null,
      spendTxId: null,
      result: null,
      paymentTxId: null,
    },
  );
  await db.insertNewTx(tx, await db.getEventById(eventId), 2, null, approval);
  const row = (await db.getTxById(tx.txId))!;

  const encryptor = new ECDSA('0b'.padStart(64, '0'));
  const publicKey = await encryptor.getPk();
  const guardKeys = [publicKey];
  const shares = ['1'];
  const submit = vi.fn();
  const guards = [{ publicKey, peerId: 'synthetic-peer', index: 0 }];
  const detection = new GuardDetection({
    messageEnc: encryptor,
    guardsPublicKey: guardKeys,
    submit,
    getPeerId: async () => 'synthetic-peer',
  });
  vi.spyOn(detection, 'activeGuards').mockResolvedValue(guards);
  const signer = new InspectableSigner({
    messageEnc: encryptor,
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
  const installed = new InstalledHandler();
  vi.spyOn(TssHandler, 'getInstance').mockReturnValue(installed);
  Configs.tssKeys = {
    encryptor,
    pubs: guardKeys.map((curvePub, index) => ({
      curvePub,
      curveShareId: shares[index],
      edwardShareId: shares[index],
    })),
  };
  const coordinator = new ZcashSigningCoordinator(
    db.dataSource,
    runtime.getSigningCapability(),
    () => approvalPolicy,
    approvalKeys[0],
  );

  return {
    runtime,
    tx,
    db,
    row,
    signer,
    guards,
    post,
    source,
    rpcMethods,
    coordinator,
    event,
    feePolicy,
    approvalPolicy,
    broadcast: () =>
      new ZcashBroadcastCoordinator(
        db.dataSource,
        runtime.getBroadcastCapability(),
        () => approvalPolicy,
        approvalKeys[0],
      ),
  };
}

async function signedFixture() {
  const f = await fixture();
  const task = await f.coordinator.start(f.row);
  void task.completion.catch(() => {});
  await vi.waitFor(() => expect(f.signer.queue()).toHaveLength(1));
  await f.signer.update();
  await f.signer.startSign(signature.digest, f.guards);
  await f.signer.handleSignData(
    StatusEnum.Success,
    signature.digest,
    signature.signature,
    signature.signatureRecovery,
  );
  await task.completion;
  const saved = (await f.db.getTxById(f.tx.txId))!;
  const signedHex = (
    f.runtime.chain.PaymentTransactionFromJson(saved.txJson) as ZcashTransaction
  ).getSignedHex()!;
  return { ...f, saved, signedHex };
}

describe(
  'Zcash retained bytes to durable broadcast',
  { timeout: 20_000 },
  () => {
    it('marks sent before RPC and observes exact bytes on a new coordinator without another send', async () => {
      const f = await signedFixture();
      await expect(f.broadcast().process(f.tx.txId)).resolves.toMatchObject({
        kind: 'submission-returned',
      });
      await expect(f.broadcast().process(f.tx.txId)).resolves.toMatchObject({
        kind: 'mempool',
        hex: f.signedHex,
      });
      expect(f.source.sends).toEqual([f.signedHex]);
      expect((await f.db.getTxById(f.tx.txId))!.txJson).toBe(f.saved.txJson);
    });

    it.each(['lostResponse', 'wrongSubmitId'] as const)(
      'retains sent after accepted %s and reconciles without resubmission',
      async (field) => {
        const f = await signedFixture();
        f.source[field] = true;
        await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow();
        expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
          TransactionStatus.sent,
        );
        await expect(f.broadcast().process(f.tx.txId)).resolves.toMatchObject({
          kind: 'mempool',
        });
        expect(f.source.sends).toEqual([f.signedHex]);
      },
    );

    it('replays only retained identical bytes after a failed send and authoritative absence', async () => {
      const f = await signedFixture();
      f.source.failBeforeAcceptance = true;
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow();
      f.source.failBeforeAcceptance = false;
      await f.broadcast().process(f.tx.txId);
      expect(f.source.sends).toEqual([f.signedHex, f.signedHex]);
      expect(f.post.mock.calls.filter(([url]) => url === 'sign')).toHaveLength(
        1,
      );
    });

    it('does not send if the final durable reservation fails', async () => {
      const f = await signedFixture();
      vi.spyOn(
        ZcashBroadcastStore.prototype,
        'reserveSubmission',
      ).mockRejectedValue(Error('controlled reservation failure'));
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow(
        /reservation failure/,
      );
      expect(f.source.sends).toEqual([]);
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.signed,
      );
    });

    it.each(['approval', 'fee'] as const)(
      'checks %s policy synchronously after the reservation await',
      async (field) => {
        const f = await signedFixture();
        const capability = f.runtime.getBroadcastCapability();
        const coordinator = new ZcashBroadcastCoordinator(
          f.db.dataSource,
          {
            ...capability,
            submit: (json, guard) =>
              capability.submit(json, {
                authorize: async () => {
                  await guard.authorize();
                  queueMicrotask(() => {
                    if (field === 'approval') f.approvalPolicy.requiredSign++;
                    else f.feePolicy.bridgeFee++;
                  });
                },
                assertCurrent: guard.assertCurrent,
              }),
          },
          () => f.approvalPolicy,
          approvalKeys[0],
        );
        await expect(coordinator.process(f.tx.txId)).rejects.toThrow(/policy/i);
        expect(f.source.sends).toEqual([]);
        const retained = (await f.db.getTxById(f.tx.txId))!;
        expect(retained.status).toBe(TransactionStatus.sent);
        expect(retained.txJson).toBe(f.saved.txJson);
      },
    );

    it('checks event revocation again at the final submission gate', async () => {
      const f = await signedFixture();
      const capability = f.runtime.getBroadcastCapability();
      const coordinator = new ZcashBroadcastCoordinator(
        f.db.dataSource,
        {
          ...capability,
          submit: async (json, guard) => {
            await f.db.ConfirmedEventRepository.update(
              { id: f.tx.eventId },
              { status: EventStatus.completed },
            );
            await capability.submit(json, guard);
          },
        },
        () => f.approvalPolicy,
        approvalKeys[0],
      );
      await expect(coordinator.process(f.tx.txId)).rejects.toThrow(
        /custody conflict/,
      );
      expect(f.source.sends).toEqual([]);
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.signed,
      );
    });

    it('authenticates a canonical but altered stored digest through the native model before RPC', async () => {
      const f = await signedFixture();
      const repository = f.db.dataSource.getRepository(
        ZcashSigningAttemptEntity,
      );
      const attempt = (await repository.findOneBy({
        attemptId: f.saved.signingAttemptId!,
      }))!;
      const binding = JSON.parse(attempt.bindingJson);
      binding.sighashAll = '12'.repeat(32);
      await repository.update(
        { attemptId: attempt.attemptId },
        { bindingJson: JSON.stringify(binding) },
      );
      const before = f.rpcMethods.length;
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow(
        /native binding mismatch/,
      );
      expect(f.rpcMethods.length).toBe(before);
      expect(f.source.sends).toEqual([]);
    });

    it('refuses absent-but-spent input without discarding retained custody', async () => {
      const f = await signedFixture();
      f.source.available = false;
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow();
      expect(f.source.sends).toEqual([]);
      const retained = (await f.db.getTxById(f.tx.txId))!;
      expect(retained.status).toBe(TransactionStatus.signed);
      expect(retained.txJson).toBe(f.saved.txJson);
    });

    it.each(['lookupFailure', 'contradictMempool'] as const)(
      'does not treat %s as permission to retry',
      async (field) => {
        const f = await signedFixture();
        f.source[field] = true;
        await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow();
        expect(f.source.sends).toEqual([]);
      },
    );

    it('observes a revoked event but refuses a new send from its retained signature', async () => {
      const f = await signedFixture();
      await f.db.ConfirmedEventRepository.update(
        { id: f.tx.eventId },
        { status: EventStatus.completed },
      );
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow(
        /event binding/,
      );
      expect(f.source.sends).toEqual([]);
      f.source.remoteHex = f.signedHex;
      f.source.available = false;
      await expect(f.broadcast().process(f.tx.txId)).resolves.toMatchObject({
        kind: 'mempool',
      });
      expect(f.source.sends).toEqual([]);
    });

    it('blocks a same-ID changed event recipient before a new submission', async () => {
      const f = await signedFixture();
      const row = await f.db.getEventById(f.tx.eventId);
      await f.db.EventRepository.update(
        { id: row!.eventData.id },
        { toAddress: reserve },
      );
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow(
        /event authority/,
      );
      expect(f.source.sends).toEqual([]);
    });

    it('refuses a changed owner after asynchronous source observation', async () => {
      const f = await signedFixture();
      f.source.beforeLookup = async () => {
        await f.db.TransactionRepository.update(
          { txId: f.tx.txId },
          { signingAttemptId: null },
        );
      };
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow();
      expect(f.source.sends).toEqual([]);
    });

    it('serializes local competing coordinators and never selects replacement bytes', async () => {
      const f = await signedFixture();
      const outcomes = await Promise.all([
        f.broadcast().process(f.tx.txId),
        f.broadcast().process(f.tx.txId),
      ]);
      expect(outcomes.map((result) => result.kind)).toEqual([
        'submission-returned',
        'mempool',
      ]);
      expect(f.source.sends).toEqual([f.signedHex]);
    });

    it('actual signed/sent processor routes ignore caller JSON and atomically settle confirmed custody', async () => {
      const f = await signedFixture();
      TestConfigs.guardPublicKeys = [...f.approvalPolicy.guardPublicKeys];
      TestConfigs.requiredSigns = f.approvalPolicy.requiredSign;
      const forgedCaller = {
        ...f.saved,
        txJson: 'caller-controlled-invalid-json',
      };
      await TransactionProcessor.processSignedTx(forgedCaller);
      f.source.confirmed = true;
      await TransactionProcessor.processSentTx(forgedCaller);
      expect(f.rpcMethods).toContain('getblock');
      expect(f.source.sends).toEqual([f.signedHex]);
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.completed,
      );
      expect((await f.db.getEventById(f.tx.eventId))!.status).toBe(
        EventStatus.pendingReward,
      );
      expect(
        (
          await f.db.dataSource
            .getRepository(ZcashSigningAttemptEntity)
            .findOneByOrFail({ attemptId: f.saved.signingAttemptId! })
        ).signedJson,
      ).toBe(f.saved.txJson);
    });
  },
);

async function settledFixture() {
  const f = await signedFixture();
  await f.broadcast().process(f.tx.txId);
  f.source.confirmed = true;
  await expect(f.broadcast().process(f.tx.txId)).resolves.toMatchObject({
    kind: 'settled',
  });
  const row = (await f.db.getEventById(f.tx.eventId))!;
  return {
    ...f,
    settledEvent: EventSerializer.fromConfirmedEntity(row),
    eventTxId: row.eventData.txId,
    rawId: row.eventData.id,
  };
}

async function setSettledConfirmationAge(
  f: Awaited<ReturnType<typeof settledFixture>>,
  maximumAgeMs: number,
) {
  const settlements = f.db.dataSource.getRepository(ZcashSettlementEntity);
  const settled = await settlements.findOneByOrFail({ txId: f.tx.txId });
  const receipt = decodeZcashSettlementReceipt(settled.receiptJson);
  await settlements.update(
    { txId: f.tx.txId },
    {
      receiptJson: encodeZcashSettlementReceipt({
        ...receipt,
        maximumAgeMs,
      }),
    },
  );
}

function rewardConsumers(f: Awaited<ReturnType<typeof settledFixture>>) {
  const reward = mockPaymentTransaction(
    TransactionType.reward,
    'ergo',
    f.tx.eventId,
  );
  const queue = vi.fn();
  const sign = vi.fn().mockResolvedValue(reward);
  const submit = vi.fn().mockResolvedValue(undefined);
  const ergo = {
    extractTransactionOrder: () => [],
    getActualTxId: async (txId: string) => txId,
    PaymentTransactionFromJson: () => reward,
    signTransaction: sign,
    submitTransaction: submit,
    getHeight: async () => 106,
    getTxConfirmationStatus: async () => ConfirmationStatus.NotFound,
    isTxInMempool: async () => false,
    isTxValid: async () => ({ isValid: true }),
  };
  vi.spyOn(ChainHandler, 'getInstance').mockReturnValue({
    getChain: (name: string) => (name === 'zcash' ? f.runtime.chain : ergo),
    getZcashBroadcastCapability: () => f.runtime.getBroadcastCapability(),
  } as unknown as ChainHandler);
  vi.spyOn(EventOrder, 'createEventRewardOrder').mockResolvedValue([]);
  const builder = vi
    .spyOn(
      EventProcessor as unknown as {
        createEventRewardDistribution: (
          ...args: unknown[]
        ) => Promise<PaymentTransaction>;
      },
      'createEventRewardDistribution',
    )
    .mockResolvedValue(reward);
  vi.spyOn(GuardTurn, 'guardTurn').mockReturnValue(0);
  vi.spyOn(GuardPkHandler, 'getInstance').mockReturnValue({
    guardId: 0,
  } as GuardPkHandler);
  vi.spyOn(TxAgreement, 'getInstance').mockResolvedValue({
    addTransactionToQueue: queue,
  } as unknown as TxAgreement);
  return { reward, queue, builder, sign, submit };
}

describe(
  'Zcash confirmed payment to actual reward consumers',
  { timeout: 20_000 },
  () => {
    it.each([
      ['allows', 18_000, true],
      ['expires', 60_001, false],
    ] as const)(
      '%s a fresh confirmation after %s ms with an old five-second settlement',
      async (_, elapsedMs, allowed) => {
        const f = await settledFixture();
        await setSettledConfirmationAge(f, 5_000);
        const c = rewardConsumers(f);
        vi.useFakeTimers({ toFake: ['Date'] });
        try {
          const startedAt = Date.now();
          let payoutLookups = 0;
          f.source.beforeLookup = async () => {
            payoutLookups++;
            if (payoutLookups === 2) vi.setSystemTime(startedAt + elapsedMs);
          };
          const reward = EventProcessor.processRewardEvent(
            f.settledEvent,
            f.eventTxId,
          );
          if (allowed) {
            await expect(reward).resolves.toBeUndefined();
            expect(c.queue).toHaveBeenCalledExactlyOnceWith(c.reward);
          } else {
            await expect(reward).rejects.toThrow(/confirmation expired/);
            expect(c.queue).not.toHaveBeenCalled();
          }
          expect(payoutLookups).toBeGreaterThanOrEqual(2);
        } finally {
          vi.useRealTimers();
        }
      },
    );

    it('does not accept any other settlement confirmation age as a policy migration', async () => {
      const f = await settledFixture();
      await setSettledConfirmationAge(f, 6_000);
      const c = rewardConsumers(f);
      await expect(
        EventProcessor.processRewardEvent(f.settledEvent, f.eventTxId),
      ).rejects.toThrow(/policy differs from settlement/);
      expect(c.queue).not.toHaveBeenCalled();
    });

    it('rechecks retained Zcash settlement before approved reward signing and signed submission', async () => {
      const f = await settledFixture();
      const c = rewardConsumers(f);
      await f.db.insertNewTx(
        c.reward,
        await f.db.getEventById(f.tx.eventId),
        2,
        null,
      );
      await f.db.setEventStatus(f.tx.eventId, EventStatus.inReward);
      const approved = (await f.db.getTxById(c.reward.txId))!;
      await TransactionProcessor.processApprovedTx(approved);
      expect(c.sign).toHaveBeenCalledTimes(1);
      expect(c.sign.mock.calls[0][0].toJson()).toBe(c.reward.toJson());
      expect(c.sign.mock.calls[0][1]).toBe(2);
      await vi.waitFor(async () =>
        expect((await f.db.getTxById(c.reward.txId))!.status).toBe(
          TransactionStatus.signed,
        ),
      );
      await TransactionProcessor.processSignedTx(
        (await f.db.getTxById(c.reward.txId))!,
      );
      expect(c.submit).toHaveBeenCalledTimes(1);
      expect(c.submit.mock.calls[0][0].toJson()).toBe(c.reward.toJson());
      expect((await f.db.getTxById(c.reward.txId))!.status).toBe(
        TransactionStatus.sent,
      );
    });

    it.each(['approved', 'signed', 'sent'] as const)(
      'refuses delayed %s reward dispatch after source confirmation loss',
      async (phase) => {
        const f = await settledFixture();
        const c = rewardConsumers(f);
        await f.db.insertNewTx(
          c.reward,
          await f.db.getEventById(f.tx.eventId),
          2,
          null,
        );
        await f.db.setEventStatus(f.tx.eventId, EventStatus.inReward);
        if (phase !== 'approved') await f.db.setTxStatus(c.reward.txId, phase);
        const row = (await f.db.getTxById(c.reward.txId))!;
        f.source.confirmed = false;
        if (phase === 'approved')
          await TransactionProcessor.processApprovedTx(row);
        else if (phase === 'signed')
          await expect(
            TransactionProcessor.processSignedTx(row),
          ).rejects.toThrow();
        else
          await expect(
            TransactionProcessor.processSentTx(row),
          ).rejects.toThrow();
        expect(c.sign).not.toHaveBeenCalled();
        expect(c.submit).not.toHaveBeenCalled();
      },
    );

    it.each(['approved', 'signed', 'sent'] as const)(
      'checks live policy synchronously after %s dispatch preparation',
      async (phase) => {
        const f = await settledFixture();
        const c = rewardConsumers(f);
        await f.db.insertNewTx(
          c.reward,
          await f.db.getEventById(f.tx.eventId),
          2,
          null,
        );
        if (phase !== 'approved') await f.db.setTxStatus(c.reward.txId, phase);
        const row = (await f.db.getTxById(c.reward.txId))!;
        const host = TransactionProcessor as unknown as {
          prepareGenericDispatch: (
            tx: typeof row,
            status: string,
          ) => Promise<{
            row: typeof row;
            paymentTx: PaymentTransaction;
            assertPolicyCurrent?: () => void;
          }>;
        };
        const original = host.prepareGenericDispatch;
        vi.spyOn(host, 'prepareGenericDispatch').mockImplementation(
          async (...args) => {
            const result = await original(...args);
            queueMicrotask(() => {
              f.feePolicy.bridgeFee++;
            });
            return result;
          },
        );
        if (phase === 'approved')
          await TransactionProcessor.processApprovedTx(row);
        else if (phase === 'signed')
          await expect(
            TransactionProcessor.processSignedTx(row),
          ).rejects.toThrow(/policy/);
        else
          await expect(TransactionProcessor.processSentTx(row)).rejects.toThrow(
            /policy/,
          );
        expect(c.sign).not.toHaveBeenCalled();
        expect(c.submit).not.toHaveBeenCalled();
      },
    );

    it('refuses a stale approved reward after the raw trigger is revoked', async () => {
      const f = await settledFixture();
      const c = rewardConsumers(f);
      await f.db.insertNewTx(
        c.reward,
        await f.db.getEventById(f.tx.eventId),
        2,
        null,
      );
      const row = (await f.db.getTxById(c.reward.txId))!;
      await f.db.EventRepository.update(
        { id: f.rawId },
        { spendTxId: '44'.repeat(32) },
      );
      await TransactionProcessor.processApprovedTx(row);
      expect(c.sign).not.toHaveBeenCalled();
      expect(c.submit).not.toHaveBeenCalled();
    });

    it('retains a receipt across coordinator instances without refreshing or regressing reward progress', async () => {
      const f = await settledFixture();
      const store = new ZcashBroadcastStore(f.db.dataSource);
      const before = await store.load(f.tx.txId);
      const eventBefore = (await f.db.getEventById(f.tx.eventId))!;
      expect(before.status).toBe('completed');
      expect(before.settlementJson).toBeTruthy();
      await f.db.setEventStatus(f.tx.eventId, EventStatus.inReward);
      await expect(f.broadcast().process(f.tx.txId)).resolves.toEqual({
        kind: 'settled',
        txId: f.tx.txId,
      });
      const after = (await f.db.getEventById(f.tx.eventId))!;
      expect(after.status).toBe(EventStatus.inReward);
      expect(after.firstTry).toBe(eventBefore.firstTry);
      expect(
        (await new ZcashBroadcastStore(f.db.dataSource).load(f.tx.txId))
          .settlementJson,
      ).toBe(before.settlementJson);
      expect(f.source.sends).toEqual([f.signedHex]);
    });

    it('does not settle when native confirmation is below the configured threshold', async () => {
      const f = await signedFixture();
      await f.broadcast().process(f.tx.txId);
      f.source.confirmed = true;
      const capability = f.runtime.getBroadcastCapability();
      const coordinator = new ZcashBroadcastCoordinator(
        f.db.dataSource,
        {
          ...capability,
          policy: () => ({ ...capability.policy(), requiredConfirmations: 2 }),
        },
        () => f.approvalPolicy,
        approvalKeys[0],
      );
      await expect(coordinator.process(f.tx.txId)).resolves.toMatchObject({
        kind: 'confirmed',
      });
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.sent,
      );
      expect((await f.db.getEventById(f.tx.eventId))!.status).toBe(
        EventStatus.inPayment,
      );
    });

    it('retains sent payment observation but does not reward an already spent trigger', async () => {
      const f = await signedFixture();
      await f.broadcast().process(f.tx.txId);
      f.source.confirmed = true;
      const raw = (await f.db.getEventById(f.tx.eventId))!.eventData;
      await f.db.EventRepository.update(
        { id: raw.id },
        { spendTxId: '44'.repeat(32) },
      );
      await expect(f.broadcast().process(f.tx.txId)).rejects.toThrow(/spent/);
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.sent,
      );
      expect((await f.db.getEventById(f.tx.eventId))!.status).toBe(
        EventStatus.inPayment,
      );
      expect(
        (await new ZcashBroadcastStore(f.db.dataSource).load(f.tx.txId))
          .settlementJson,
      ).toBeNull();
    });

    it('uses the retained settlement in actual generation, verification and same-reward request retry', async () => {
      const f = await settledFixture();
      const c = rewardConsumers(f);
      await EventProcessor.processRewardEvent(f.settledEvent, f.eventTxId);
      expect(c.builder).toHaveBeenCalledWith(
        f.settledEvent,
        f.eventTxId,
        f.feePolicy,
        f.tx.txId,
      );
      expect(c.queue).toHaveBeenCalledWith(c.reward);
      await expect(
        TransactionVerifier.verifyEventTransaction(
          c.reward,
          f.settledEvent,
          f.eventTxId,
        ),
      ).resolves.toBe(true);
      await f.db.insertNewTx(
        c.reward,
        await f.db.getEventById(f.tx.eventId),
        2,
        null,
      );
      await expect(
        RequestVerifier.verifyEventTransactionRequest(c.reward),
      ).resolves.toBe(true);
      await f.db.EventRepository.update({ id: f.rawId }, { spendHeight: 107 });
      await expect(
        RequestVerifier.verifyEventTransactionRequest(c.reward),
      ).rejects.toThrow(/spent/);
    });

    it.each(['serialized', 'toChain', 'spendTxId'] as const)(
      'rejects settled %s drift in both actual consumers',
      async (field) => {
        const f = await settledFixture();
        const c = rewardConsumers(f);
        const value =
          field === 'serialized'
            ? Buffer.from('other').toString('base64')
            : field === 'toChain'
              ? 'bitcoin'
              : '44'.repeat(32);
        await f.db.EventRepository.update({ id: f.rawId }, { [field]: value });
        const changed = EventSerializer.fromConfirmedEntity(
          (await f.db.getEventById(f.tx.eventId))!,
        );
        await expect(
          EventProcessor.processRewardEvent(changed, f.eventTxId),
        ).rejects.toThrow();
        await expect(
          TransactionVerifier.verifyEventTransaction(
            c.reward,
            changed,
            f.eventTxId,
          ),
        ).rejects.toThrow();
        expect(c.builder).not.toHaveBeenCalled();
        expect(c.queue).not.toHaveBeenCalled();
      },
    );

    it.each(['event', 'triggerTxId'] as const)(
      'rejects caller %s mismatch against the retained settlement',
      async (field) => {
        const f = await settledFixture();
        const c = rewardConsumers(f);
        const suppliedEvent =
          field === 'event'
            ? {
                ...f.settledEvent,
                amount: (BigInt(f.settledEvent.amount) + 1n).toString(),
              }
            : f.settledEvent;
        const suppliedTxId =
          field === 'triggerTxId' ? '44'.repeat(32) : f.eventTxId;
        await expect(
          EventProcessor.processRewardEvent(suppliedEvent, suppliedTxId),
        ).rejects.toThrow(/differs from settled context/);
        await expect(
          TransactionVerifier.verifyEventTransaction(
            c.reward,
            suppliedEvent,
            suppliedTxId,
          ),
        ).rejects.toThrow(/differs from settled context/);
        expect(c.queue).not.toHaveBeenCalled();
      },
    );

    it('refuses reward after confirmation disappears while preserving settled history', async () => {
      const f = await settledFixture();
      const c = rewardConsumers(f);
      f.source.confirmed = false;
      await expect(
        EventProcessor.processRewardEvent(f.settledEvent, f.eventTxId),
      ).rejects.toThrow(/confirmation/);
      await expect(
        TransactionVerifier.verifyEventTransaction(
          c.reward,
          f.settledEvent,
          f.eventTxId,
        ),
      ).rejects.toThrow(/confirmation/);
      expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
        TransactionStatus.completed,
      );
      expect(c.queue).not.toHaveBeenCalled();
    });

    it.each(['spend', 'fee'] as const)(
      'rechecks %s after building before queue insertion',
      async (field) => {
        const f = await settledFixture();
        const c = rewardConsumers(f);
        c.builder.mockImplementation(async () => {
          if (field === 'spend')
            await f.db.EventRepository.update(
              { id: f.rawId },
              { spendTxId: '44'.repeat(32) },
            );
          else f.feePolicy.bridgeFee++;
          return c.reward;
        });
        await expect(
          EventProcessor.processRewardEvent(f.settledEvent, f.eventTxId),
        ).rejects.toThrow();
        expect(c.queue).not.toHaveBeenCalled();
      },
    );

    it('does not authorize a merely signed payment with no settlement receipt', async () => {
      const f = await signedFixture();
      const raw = (await f.db.getEventById(f.tx.eventId))!;
      await expect(
        new ZcashRewardEligibility(
          f.db.dataSource,
          f.runtime.getBroadcastCapability(),
        ).capture(EventSerializer.fromConfirmedEntity(raw), raw.eventData.txId),
      ).rejects.toThrow(/completed settlement/);
    });
  },
);

describe('Zcash guard runtime registration', () => {
  it('refuses disabled and malformed registration configuration', () => {
    expect(parseZcashGuardConfig(undefined)).toBeUndefined();
    expect(parseZcashGuardConfig({ enabled: false })).toBeUndefined();
    expect(() =>
      parseZcashGuardConfig({
        ...rawConfig(),
        rpc: { ...rawConfig().rpc, rpcUrl: 'http://zcash.example/' },
      }),
    ).toThrow('zcash.rpc.rpcUrl');
  });

  it('generates, approves and signs through the registered real Zcash components', async () => {
    const f = await fixture();
    const task = await f.coordinator.start(f.row);
    void task.completion.catch(() => {});
    await vi.waitFor(() => expect(f.signer.queue()).toHaveLength(1));
    await f.signer.update();
    await f.signer.startSign(signature.digest, f.guards);
    await f.signer.handleSignData(
      StatusEnum.Success,
      signature.digest,
      signature.signature,
      signature.signatureRecovery,
    );
    await task.completion;

    const saved = (await f.db.getTxById(f.tx.txId))!;
    expect(saved.status).toBe(TransactionStatus.signed);
    const signed = f.runtime.chain.PaymentTransactionFromJson(saved.txJson);
    expect(
      f.runtime.chain.verifyTransactionExtraConditions(
        signed,
        SigningStatus.Signed,
      ),
    ).toBe(true);
    expect(f.rpcMethods).toContain('getaddressutxos');
    expect(
      f.rpcMethods.filter((method) => method === 'gettxout').length,
    ).toBeGreaterThan(1);
    expect(f.post.mock.calls.filter(([url]) => url === 'sign')).toHaveLength(1);
  });

  it('refreshes real RPC evidence and refuses a stale reserve output before signing', async () => {
    const f = await fixture();
    const task = await f.coordinator.start(f.row);
    void task.completion.catch(() => {});
    await vi.waitFor(() => expect(f.signer.queue()).toHaveLength(1));
    f.source.available = false;

    await expect(f.signer.update()).rejects.toThrow(/unavailable_prevout/);
    await expect(task.completion).rejects.toBeTypeOf('string');
    expect(f.post.mock.calls.filter(([url]) => url === 'sign')).toHaveLength(0);
    expect((await f.db.getTxById(f.tx.txId))!.status).toBe(
      TransactionStatus.inSign,
    );
  });
});
