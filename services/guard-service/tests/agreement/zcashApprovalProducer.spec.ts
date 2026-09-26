import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Communicator } from '@rosen-bridge/communication';
import { ECDSA } from '@rosen-bridge/encryption';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import { ApprovedCandidate } from '../../src/agreement/interfaces';
import {
  decodeTransactionApproval,
  verifyTransactionApproval,
} from '../../src/agreement/transactionApproval';
import TxAgreement from '../../src/agreement/txAgreement';
import { DatabaseAction } from '../../src/db/databaseAction';
import PublicStatusHandler from '../../src/handlers/publicStatusHandler';
import * as TransactionSerializer from '../../src/transaction/transactionSerializer';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import Utils from '../../src/utils/utils';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockEventTrigger } from '../event/testData';
import TestConfigs from '../testUtils/testConfigs';

// Tests the real producer, ECDSA and DB join. Event/native eligibility is an
// explicit controlled precondition here; these bytes are not a native Zcash tx.
const signers = [1, 2, 3, 4].map(
  (index) => new ECDSA(index.toString(16).padStart(64, '0')),
);
const timestamp = 1_700_000_000;
class Producer extends TxAgreement {
  requests = 0;
  broadcasts: ApprovedCandidate[] = [];
  onRequest = async () => {};
  onBroadcast = async () => {};
  constructor() {
    super();
    this.messageEnc = signers[0];
  }
  protected verifyTransactionRequest = async () => {
    this.requests++;
    await this.onRequest();
    return true;
  };
  protected broadcastApprovalMessage = async (candidate: ApprovedCandidate) => {
    this.broadcasts.push(candidate);
    await this.onBroadcast();
  };
  receive = (tx: PaymentTransaction, signatures: string[]) =>
    this.processApprovalMessage(
      tx,
      0,
      signatures,
      timestamp,
      'synthetic-local-peer',
    );
  collect = async (tx: PaymentTransaction, signatures: string[]) => {
    const hash = TransactionSerializer.getTxDataHash(tx);
    this.transactions.set(hash, { tx, timestamp });
    this.transactionApprovals.set(hash, [signatures[0], signatures[1], '', '']);
    await this.processAgreementResponse(hash, 2, signatures[2], timestamp);
  };
  persistWithoutProof = (tx: PaymentTransaction) => this.setTxAsApproved(tx);
}

const fixture = async () => {
  const event = mockEventTrigger().event;
  await DatabaseActionMock.insertEventRecord(event, EventStatus.pendingPayment);
  const tx = new PaymentTransaction(
    'zcash',
    'ab'.repeat(32),
    Utils.txIdToEventId(event.sourceTxId),
    Buffer.from('synthetic approved proposal'),
    TransactionType.payment,
  );
  const txDataHash = TransactionSerializer.getTxDataHash(tx);
  const signatures = await Promise.all(
    signers.map((signer, index) =>
      signer.sign(
        Communicator.generatePayloadToSign(
          { txDataHash },
          timestamp,
          TestConfigs.guardPublicKeys[index],
          '1.0.0',
        ),
      ),
    ),
  );
  signatures[3] = '';
  return {
    tx,
    signatures,
    policy: {
      guardPublicKeys: [...TestConfigs.guardPublicKeys],
      requiredSign: 3,
      protocolVersion: '1.0.0' as const,
    },
  };
};
const db = () => DatabaseAction.getInstance();
const saved = async (tx: PaymentTransaction) =>
  db().TransactionRepository.findOneByOrFail({ txId: tx.txId });
let previousKeys: string[];
let previousThreshold: number;
beforeEach(async () => {
  previousKeys = TestConfigs.guardPublicKeys;
  previousThreshold = TestConfigs.requiredSigns;
  TestConfigs.guardPublicKeys = await Promise.all(
    signers.map((signer) => signer.getPk()),
  );
  TestConfigs.requiredSigns = 3;
  await DatabaseActionMock.clearTables();
});
afterEach(() => {
  TestConfigs.guardPublicKeys = previousKeys;
  TestConfigs.requiredSigns = previousThreshold;
  vi.restoreAllMocks();
});

describe('Zcash approval producer persistence', () => {
  it.each(['receive', 'collect'] as const)(
    'persists real signatures through the %s route',
    async (route) => {
      const { tx, signatures, policy } = await fixture();
      const producer = new Producer();
      await producer[route](tx, signatures);
      const row = await saved(tx);
      const approval = await verifyTransactionApproval(
        row.approvalEvidence!,
        policy,
        signers[0],
      );
      expect(approval.approvedTxJson).toBe(tx.toJson());
      expect(row).toMatchObject({
        txJson: approval.approvedTxJson,
        requiredSign: 3,
        status: TransactionStatus.approved,
      });
      expect((await db().getEventById(tx.eventId))!.status).toBe(
        EventStatus.inPayment,
      );
      expect(producer.requests).toBe(route === 'receive' ? 1 : 0);
    },
  );

  it('rejects a bad indexed signature before persisting or verifying the request', async () => {
    const { tx, signatures } = await fixture();
    signatures[1] = signatures[0];
    const producer = new Producer();
    await producer.receive(tx, signatures);
    expect(await db().getTxById(tx.txId)).toBeNull();
    expect(producer.requests).toBe(0);
  });

  it('requires a certificate even on the direct approval persistence route', async () => {
    const { tx } = await fixture();
    await new Producer().persistWithoutProof(tx);
    expect(await db().getTxById(tx.txId)).toBeNull();
  });

  it.each(['proposal', 'threshold', 'membership', 'refresh'] as const)(
    'rejects %s changing during real signature verification',
    async (change) => {
      const { tx, signatures } = await fixture();
      const producer = new Producer();
      const actualVerify = signers[0].verify;
      vi.spyOn(signers[0], 'verify').mockImplementationOnce(async (...args) => {
        if (change === 'proposal')
          tx.txBytes = Buffer.from('different proposal, same native ID');
        if (change === 'threshold') TestConfigs.requiredSigns = 2;
        if (change === 'membership') TestConfigs.guardPublicKeys.reverse();
        if (change === 'refresh')
          TestConfigs.guardPublicKeys = [...TestConfigs.guardPublicKeys];
        return actualVerify(...args);
      });
      await producer.receive(tx, signatures);
      expect(await db().getTxById(tx.txId)).toBeNull();
    },
  );

  it.each(['request', 'broadcast'] as const)(
    'rechecks proposal after awaiting %s',
    async (stage) => {
      const { tx, signatures } = await fixture();
      const producer = new Producer();
      const mutate = async () => {
        tx.txBytes = Buffer.from('changed after approval verification');
      };
      if (stage === 'request') producer.onRequest = mutate;
      else producer.onBroadcast = mutate;
      await producer[stage === 'request' ? 'receive' : 'collect'](
        tx,
        signatures,
      );
      expect(await db().getTxById(tx.txId)).toBeNull();
      expect((await db().getEventById(tx.eventId))!.status).toBe(
        EventStatus.pendingPayment,
      );
    },
  );

  it('copies the received signature array before asynchronous verification', async () => {
    const { tx, signatures, policy } = await fixture();
    const actualVerify = signers[0].verify;
    vi.spyOn(signers[0], 'verify').mockImplementationOnce(async (...args) => {
      signatures.fill('');
      return actualVerify(...args);
    });
    await new Producer().receive(tx, signatures);
    const row = await saved(tx);
    expect(
      (
        await verifyTransactionApproval(
          row.approvalEvidence!,
          policy,
          signers[0],
        )
      ).signatures.filter(Boolean),
    ).toHaveLength(3);
  });

  it('reopens file-backed SQLite and replays the persisted certificate without producer memory', async () => {
    const database = join(
      tmpdir(),
      `rosen-zcash-approval-${randomUUID()}.sqlite`,
    );
    const sqliteOptions = DatabaseActionMock.testDataSource.options;
    if (sqliteOptions.type !== 'sqlite')
      throw new Error('Expected SQLite test source');
    const makeSource = () => new DataSource({ ...sqliteOptions, database });
    let source = makeSource();
    try {
      await source.initialize();
      await source.runMigrations();
      DatabaseActionMock.testDatabase = DatabaseAction.init(source);
      await PublicStatusHandler.init(source);
      const { tx, signatures, policy } = await fixture();
      const producer = new Producer();
      await producer.collect(tx, signatures);
      const before = await saved(tx);
      producer.clearTransactions();
      await source.destroy();
      source = makeSource();
      await source.initialize();
      expect(await source.runMigrations()).toHaveLength(0);
      DatabaseAction.init(source);
      const after = await saved(tx);
      expect(after.approvalEvidence).toBe(before.approvalEvidence);
      const replayed = await verifyTransactionApproval(
        after.approvalEvidence!,
        policy,
        signers[0],
      );
      expect(replayed.txDataHash).toBe(TransactionSerializer.getTxDataHash(tx));
      expect(
        decodeTransactionApproval(after.approvalEvidence!).approvedTxJson,
      ).toBe(after.txJson);
    } finally {
      if (source.isInitialized) await source.destroy();
      DatabaseActionMock.testDatabase = DatabaseAction.init(
        DatabaseActionMock.testDataSource,
      );
      await PublicStatusHandler.init(DatabaseActionMock.testDataSource);
      await unlink(database).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  });
});
