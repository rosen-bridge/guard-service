import {
  binToHex,
  encodeTransactionBCH,
  hashTransaction,
  hexToBin,
  secp256k1,
} from '@bitauth/libauth';

import { TransactionType } from '@rosen-chains/abstract-chain';
import {
  BitcoinCashTransaction,
  getBchSigningDigest,
} from '@rosen-chains/bitcoin-cash';

import { assertBitcoinCashDatabaseCompatible } from '../../src/db/bitcoinCashState';
import { DatabaseAction } from '../../src/db/databaseAction';
import EventSerializer from '../../src/event/eventSerializer';
import { TransactionStatus } from '../../src/utils/constants';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from './bitcoinCashNamespaceFixtures';
import DatabaseActionMock from './mocked/databaseAction.mock';

const transaction = (eventId = '') => {
  const script = '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac';
  const input = {
    outpointTransactionHash: new Uint8Array(32).fill(1),
    outpointIndex: 0,
    sequenceNumber: 0xffffffff,
    unlockingBytecode: new Uint8Array(),
  };
  const parent = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [input],
    outputs: [{ lockingBytecode: hexToBin(script), valueSatoshis: 50_000n }],
  });
  const prevout = {
    txId: hashTransaction(parent),
    index: 0,
    value: 50_000n,
    scriptPubKey: script,
    parentTransactionHex: binToHex(parent),
  };
  const bytes = encodeTransactionBCH({
    version: 2,
    locktime: 0,
    inputs: [{ ...input, outpointTransactionHash: hexToBin(prevout.txId) }],
    outputs: [{ lockingBytecode: hexToBin(script), valueSatoshis: 49_000n }],
  });
  return new BitcoinCashTransaction(
    eventId,
    bytes,
    TransactionType.payment,
    [prevout],
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  );
};
const check = () =>
  assertBitcoinCashDatabaseCompatible(DatabaseActionMock.testDataSource, true);

describe('BCH startup database compatibility', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());

  it('does not read database state while BCH is disabled', async () => {
    const source = {
      getRepository: () => {
        throw Error('Unexpected access');
      },
    };
    await expect(
      assertBitcoinCashDatabaseCompatible(source as never, false),
    ).resolves.toBeUndefined();
  });

  it('accepts unchanged raw request IDs with new confirmed guard IDs', async () => {
    await insertNamespaceEvent(namespaceEvent(), 'creation');
    await expect(check()).resolves.toBeUndefined();
  });

  it('rejects a legacy confirmed guard ID without changing the row', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'creation');
    const db = DatabaseAction.getInstance();
    await db.ConfirmedEventRepository.update(EventSerializer.getId(raw), {
      id: raw.eventId,
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
    expect(
      (await db.ConfirmedEventRepository.findOneByOrFail({ id: raw.eventId }))
        .id,
    ).toBe(raw.eventId);
  });

  it('rejects a legacy rejected guard ID independently', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'creation');
    const db = DatabaseAction.getInstance();
    await db.ConfirmedEventRepository.clear();
    await db.RejectedEventRepository.insert({
      eventData: raw,
      eventDataId: raw.id,
      id: raw.eventId,
      reason: 'old',
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  it('rejects corrupted request metadata independently', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'creation');
    await DatabaseAction.getInstance().EventRepository.update(raw.id, {
      eventId: 'ab'.repeat(32),
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  it('rejects a wrong related envelope event ID on another destination chain', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'creation');
    const db = DatabaseAction.getInstance();
    const tx = transaction(EventSerializer.getId(raw));
    await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);
    await db.TransactionRepository.update(tx.txId, {
      chain: 'ergo',
      txJson: JSON.stringify({ eventId: raw.eventId }),
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  it.each([
    TransactionStatus.signed,
    TransactionStatus.sent,
    TransactionStatus.completed,
  ])('rejects unsigned BCH bytes labeled %s', async (status) => {
    await DatabaseActionMock.insertTxRecord(transaction(), status);
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  it('accepts unsigned approved rows and authenticated completed signed rows', async () => {
    const tx = transaction();
    await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);
    await expect(check()).resolves.toBeUndefined();
    const signature = secp256k1.signMessageHashCompact(
      hexToBin('00'.repeat(31) + '01'),
      getBchSigningDigest(
        tx.txBytes,
        tx.prevouts,
        tx.prevouts[0].scriptPubKey,
        0,
      ),
    );
    expect(typeof signature).not.toBe('string');
    const signed = tx.withSignatures([binToHex(signature as Uint8Array)]);
    await DatabaseAction.getInstance().TransactionRepository.update(tx.txId, {
      status: TransactionStatus.completed,
      txJson: signed.toJson(),
    });
    await expect(check()).resolves.toBeUndefined();
  });

  it('rejects an approval row ID mismatch independently', async () => {
    const tx = transaction();
    await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);
    await DatabaseAction.getInstance().TransactionRepository.update(tx.txId, {
      txId: 'ab'.repeat(32),
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  it('checks a rejected legacy alias beyond the first page', async () => {
    const db = DatabaseAction.getInstance();
    for (let i = 0; i < 102; i++) {
      const event = namespaceEvent('bitcoin-cash', {
        sourceTxId: i.toString(16).padStart(64, '0'),
      });
      const raw = await insertNamespaceEvent(event, `creation-${i}`);
      await db.RejectedEventRepository.insert({
        eventData: raw,
        eventDataId: raw.id,
        id: i === 101 ? raw.eventId : EventSerializer.getId(raw),
        reason: 'test',
      });
    }
    await expect(check()).rejects.toThrow('authenticated remediation');
  });
});
