import { binToHex, hexToBin, secp256k1 } from '@bitauth/libauth';

import { getBchSigningDigest } from '@rosen-chains/bitcoin-cash';

import { assertBitcoinCashDatabaseCompatible } from '../../src/db/bitcoinCashState';
import { DatabaseAction } from '../../src/db/databaseAction';
import EventSerializer from '../../src/event/eventSerializer';
import { TransactionStatus } from '../../src/utils/constants';
import {
  insertNamespaceEvent,
  namespaceEvent,
} from './bitcoinCashNamespaceTestUtils';
import { transaction, check } from './bitcoinCashStateTestUtils';
import DatabaseActionMock from './mocked/databaseAction.mock';

describe('assertBitcoinCashDatabaseCompatible', () => {
  beforeEach(async () => DatabaseActionMock.clearTables());

  /**
   * @target assertBitcoinCashDatabaseCompatible - does not read database state
   * while BCH is disabled
   * @dependencies
   * - A database seam that throws if a repository is accessed
   * @scenario
   * - Run the startup check with BCH disabled
   * @expected
   * - The check resolves without touching the database
   */
  it('does not read database state while BCH is disabled', async () => {
    const source = {
      /** Provide the getRepository test seam for the current scenario without external requests. */
      getRepository: () => {
        throw Error('Unexpected access');
      },
    };
    await expect(
      assertBitcoinCashDatabaseCompatible(source as never, false),
    ).resolves.toBeUndefined();
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - accepts unchanged raw
   * request IDs with new confirmed guard IDs
   * @dependencies
   * - Migrated test database and namespace event fixture
   * @scenario
   * - Insert a raw request and its current confirmed guard identity
   * - Run the compatibility check
   * @expected
   * - The check resolves
   */
  it('accepts unchanged raw request IDs with new confirmed guard IDs', async () => {
    await insertNamespaceEvent(namespaceEvent(), 'creation');
    await expect(check()).resolves.toBeUndefined();
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - rejects a legacy confirmed
   * guard ID without changing the row
   * @dependencies
   * - Migrated test database and namespace event fixture
   * @scenario
   * - Replace the confirmed guard ID with the raw request ID
   * - Run the check and reread the stored row
   * @expected
   * - The check requires authenticated remediation; the row is unchanged
   */
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
    ).toEqual(raw.eventId);
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - rejects a legacy rejected
   * guard ID independently
   * @dependencies
   * - Migrated test database and namespace event fixture
   * @scenario
   * - Remove the confirmed row and insert a rejected row with a legacy ID
   * @expected
   * - The isolated rejected-row check requires authenticated remediation
   */
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

  /**
   * @target assertBitcoinCashDatabaseCompatible - rejects corrupted request
   * metadata independently
   * @dependencies
   * - Migrated test database and namespace event fixture
   * @scenario
   * - Change the raw event ID without altering the related guard row
   * @expected
   * - The check requires authenticated remediation
   */
  it('rejects corrupted request metadata independently', async () => {
    const raw = await insertNamespaceEvent(namespaceEvent(), 'creation');
    await DatabaseAction.getInstance().EventRepository.update(raw.id, {
      eventId: 'ab'.repeat(32),
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - rejects a wrong related
   * envelope event ID on another destination chain
   * @dependencies
   * - Migrated test database, event fixture and native transaction fixture
   * @scenario
   * - Store an approved row, change its destination chain and envelope ID
   * @expected
   * - The check rejects the inconsistent event reference
   */
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

  /**
   * @target assertBitcoinCashDatabaseCompatible - rejects unsigned BCH bytes
   * labeled %s
   * @dependencies
   * - Migrated test database and native unsigned transaction fixture
   * @scenario
   * - Store unsigned BCH bytes with signed, sent and completed statuses
   * @expected
   * - Every lifecycle mismatch requires authenticated remediation
   */
  it.each([
    TransactionStatus.signed,
    TransactionStatus.sent,
    TransactionStatus.completed,
  ])('rejects unsigned BCH bytes labeled %s', async (status) => {
    await DatabaseActionMock.insertTxRecord(transaction(), status);
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - accepts unsigned approved
   * rows and authenticated completed signed rows
   * @dependencies
   * - Migrated test database, native transaction fixture and libauth signer
   * @scenario
   * - Check an unsigned approved row, then attach a valid synthetic signature
   * - Replace it with the completed signed envelope and recheck
   * @expected
   * - Both compatible lifecycle states resolve
   */
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
    expect(typeof signature).not.toEqual('string');
    const signed = tx.withSignatures([binToHex(signature as Uint8Array)]);
    await DatabaseAction.getInstance().TransactionRepository.update(tx.txId, {
      status: TransactionStatus.completed,
      txJson: signed.toJson(),
    });
    await expect(check()).resolves.toBeUndefined();
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - rejects an approval row ID
   * mismatch independently
   * @dependencies
   * - Migrated test database and native transaction fixture
   * @scenario
   * - Change only the stored approval transaction ID
   * @expected
   * - The check requires authenticated remediation
   */
  it('rejects an approval row ID mismatch independently', async () => {
    const tx = transaction();
    await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);
    await DatabaseAction.getInstance().TransactionRepository.update(tx.txId, {
      txId: 'ab'.repeat(32),
    });
    await expect(check()).rejects.toThrow('authenticated remediation');
  });

  /**
   * @target assertBitcoinCashDatabaseCompatible - checks a rejected legacy
   * alias beyond the first page
   * @dependencies
   * - Migrated test database and 102 distinct namespace event fixtures
   * @scenario
   * - Insert 101 current rejected IDs followed by one legacy alias
   * - Run the paginated compatibility check
   * @expected
   * - The last row is detected and authenticated remediation is required
   */
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
