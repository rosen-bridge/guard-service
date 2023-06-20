import DatabaseActionMock from './mocked/DatabaseAction.mock';
import EventSerializer from '../../src/event/EventSerializer';
import * as TxTestData from '../agreement/testData';
import * as EventTestData from '../event/testData';
import {
  PaymentTransaction,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { EventStatus, TransactionStatus } from '../../src/models/Models';
import { dbAction } from '../../src/db/DatabaseAction';

describe('DatabaseAction', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  describe('insertTx', () => {
    /**
     * @target DatabaseAction.insertTx should throw error when event is not found
     * and tx type is not cold storage
     * @dependencies
     * - database
     * @scenario
     * - mock transaction
     * - run test and expect exception thrown
     * @expected
     * - should throw Error
     */
    it('should throw error when event is not found and tx type is not cold storage', async () => {
      // mock event and transaction
      const tx = TxTestData.mockPaymentTransaction(TransactionTypes.payment);

      // run test and expect exception thrown
      await expect(async () => {
        await dbAction.insertTx(tx);
      }).rejects.toThrow(Error);
    });
  });

  describe('insertEventTx', () => {
    /**
     * @target DatabaseAction.insertEventTx should insert tx when
     * there is no other tx for the event
     * @dependencies
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should be inserted into db
     */
    it('should insert tx when there is no other tx for the event', async () => {
      // mock event and transaction
      const mockedEvent = EventTestData.mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = TxTestData.mockPaymentTransaction(
        TransactionTypes.payment,
        mockedEvent.toChain,
        eventId
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // run test
      await dbAction.insertTx(tx);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event.id,
      ]);
      expect(dbTxs).toEqual([[tx.txId, eventId]]);
    });

    /**
     * @target DatabaseAction.insertEventTx should NOT insert tx when
     * there is already an advanced tx for the event
     * @dependencies
     * - database
     * @scenario
     * - mock event and two transactions
     * - insert mocked event into db
     * - insert one of the txs into db (with `inSign` status)
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should NOT be inserted into db
     */
    it('should NOT insert tx when there is already an advanced tx for the event', async () => {
      // mock event and two transactions
      const mockedEvent = EventTestData.mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent);
      const tx1 = TxTestData.mockPaymentTransaction(
        TransactionTypes.payment,
        mockedEvent.toChain,
        eventId
      );
      const tx2 = TxTestData.mockPaymentTransaction(
        TransactionTypes.payment,
        mockedEvent.toChain,
        eventId
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert one of the txs into db
      await DatabaseActionMock.insertTxRecord(tx2, TransactionStatus.inSign);

      // run test
      await dbAction.insertTx(tx1);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([tx2.txId]);
    });

    /**
     * @target DatabaseAction.insertEventTx should insert tx when
     * txId is lower than existing approved tx
     * @dependencies
     * - database
     * @scenario
     * - mock event and two transactions
     * - insert mocked event into db
     * - insert tx with higher txId (with `approved` status)
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should be inserted into db
     */
    it('should insert tx when txId is lower than existing approved tx', async () => {
      // mock event and two transactions
      const mockedEvent = EventTestData.mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent);
      const txs = [
        TxTestData.mockPaymentTransaction(
          TransactionTypes.payment,
          mockedEvent.toChain,
          eventId
        ),
        TxTestData.mockPaymentTransaction(
          TransactionTypes.payment,
          mockedEvent.toChain,
          eventId
        ),
      ];
      let highTx: PaymentTransaction;
      let lowTx: PaymentTransaction;
      if (txs[0].txId < txs[1].txId) {
        highTx = txs[1];
        lowTx = txs[0];
      } else {
        highTx = txs[0];
        lowTx = txs[1];
      }

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert tx with higher txId (with `approved` status)
      await DatabaseActionMock.insertTxRecord(
        highTx,
        TransactionStatus.approved
      );

      // run test
      await dbAction.insertTx(lowTx);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseAction.insertEventTx should NOT insert tx when
     * txId is higher than existing approved tx
     * @dependencies
     * - database
     * @scenario
     * - mock event and two transactions
     * - insert mocked event into db
     * - insert tx with lower txId (with `approved` status)
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should NOT be inserted into db
     */
    it('should NOT insert tx when txId is higher than existing approved tx', async () => {
      // mock event and two transactions
      const mockedEvent = EventTestData.mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent);
      const txs = [
        TxTestData.mockPaymentTransaction(
          TransactionTypes.payment,
          mockedEvent.toChain,
          eventId
        ),
        TxTestData.mockPaymentTransaction(
          TransactionTypes.payment,
          mockedEvent.toChain,
          eventId
        ),
      ];
      let highTx: PaymentTransaction;
      let lowTx: PaymentTransaction;
      if (txs[0].txId < txs[1].txId) {
        highTx = txs[1];
        lowTx = txs[0];
      } else {
        highTx = txs[0];
        lowTx = txs[1];
      }

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert tx with lower txId (with `approved` status)
      await DatabaseActionMock.insertTxRecord(
        lowTx,
        TransactionStatus.approved
      );

      // run test
      await dbAction.insertTx(highTx);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseAction.insertEventTx should update failedInSign when
     * tx is already in database
     * @dependencies
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event and transaction into db
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx failedInSign field should be updated to false
     */
    it('should update failedInSign when tx is already in database', async () => {
      // mock event and transaction
      const mockedEvent = EventTestData.mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = TxTestData.mockPaymentTransaction(
        TransactionTypes.payment,
        mockedEvent.toChain,
        eventId
      );

      // insert mocked event and transaction into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // run test
      await dbAction.insertTx(tx);

      // tx failedInSign field should be updated to false
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.failedInSign,
      ]);
      expect(dbTxs).toEqual([[tx.txId, false]]);
    });
  });

  describe('insertColdStorageTx', () => {
    /**
     * @target DatabaseAction.insertColdStorageTx should insert tx when
     * there is no other tx for the chain
     * @dependencies
     * - database
     * @scenario
     * - mock transaction
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should be inserted into db
     */
    it('should insert tx when there is no other tx for the event', async () => {
      // mock transaction
      const chain = 'chain';
      const tx = TxTestData.mockPaymentTransaction(
        TransactionTypes.coldStorage,
        chain,
        ''
      );

      // run test
      await dbAction.insertTx(tx);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event,
        tx.chain,
      ]);
      expect(dbTxs).toEqual([[tx.txId, null, tx.network]]);
    });

    /**
     * @target DatabaseAction.insertColdStorageTx should NOT insert tx when
     * there is already an advanced tx for the chain
     * @dependencies
     * - database
     * @scenario
     * - mock two transactions
     * - insert one of the txs into db (with `inSign` status)
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should NOT be inserted into db
     */
    it('should NOT insert tx when there is already an advanced tx for the chain', async () => {
      // mock two transactions
      const chain = 'chain';
      const tx1 = TxTestData.mockPaymentTransaction(
        TransactionTypes.coldStorage,
        chain,
        ''
      );
      const tx2 = TxTestData.mockPaymentTransaction(
        TransactionTypes.coldStorage,
        chain,
        ''
      );

      // insert one of the txs into db
      await DatabaseActionMock.insertTxRecord(tx2, TransactionStatus.inSign);

      // run test
      await dbAction.insertTx(tx1);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([tx2.txId]);
    });

    /**
     * @target DatabaseAction.insertColdStorageTx should insert tx when
     * txId is lower than existing approved tx
     * @dependencies
     * - database
     * @scenario
     * - mock two transactions
     * - insert tx with higher txId (with `approved` status)
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should be inserted into db
     */
    it('should insert tx when txId is lower than existing approved tx', async () => {
      // mock two transactions
      const chain = 'chain';
      const txs = [
        TxTestData.mockPaymentTransaction(
          TransactionTypes.coldStorage,
          chain,
          ''
        ),
        TxTestData.mockPaymentTransaction(
          TransactionTypes.coldStorage,
          chain,
          ''
        ),
      ];
      let highTx: PaymentTransaction;
      let lowTx: PaymentTransaction;
      if (txs[0].txId < txs[1].txId) {
        highTx = txs[1];
        lowTx = txs[0];
      } else {
        highTx = txs[0];
        lowTx = txs[1];
      }

      // insert tx with higher txId (with `approved` status)
      await DatabaseActionMock.insertTxRecord(
        highTx,
        TransactionStatus.approved
      );

      // run test
      await dbAction.insertTx(lowTx);

      // tx should be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseAction.insertColdStorageTx should NOT insert tx when
     * txId is higher than existing approved tx
     * @dependencies
     * - database
     * @scenario
     * - mock two transactions
     * - insert tx with lower txId (with `approved` status)
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should NOT be inserted into db
     */
    it('should NOT insert tx when txId is higher than existing approved tx', async () => {
      // mock two transactions
      const chain = 'chain';
      const txs = [
        TxTestData.mockPaymentTransaction(
          TransactionTypes.coldStorage,
          chain,
          ''
        ),
        TxTestData.mockPaymentTransaction(
          TransactionTypes.coldStorage,
          chain,
          ''
        ),
      ];
      let highTx: PaymentTransaction;
      let lowTx: PaymentTransaction;
      if (txs[0].txId < txs[1].txId) {
        highTx = txs[1];
        lowTx = txs[0];
      } else {
        highTx = txs[0];
        lowTx = txs[1];
      }

      // insert tx with lower txId (with `approved` status)
      await DatabaseActionMock.insertTxRecord(
        lowTx,
        TransactionStatus.approved
      );

      // run test
      await dbAction.insertTx(highTx);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseAction.insertColdStorageTx should update failedInSign when
     * tx is already in database
     * @dependencies
     * - database
     * @scenario
     * - mock transaction
     * - insert mocked transaction into db
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx failedInSign field should be updated to false
     */
    it('should update failedInSign when tx is already in database', async () => {
      // mock transaction
      const chain = 'chain';
      const tx = TxTestData.mockPaymentTransaction(
        TransactionTypes.coldStorage,
        chain,
        ''
      );

      // insert mocked transaction into db
      await DatabaseActionMock.insertTxRecord(tx, TransactionStatus.approved);

      // run test
      await dbAction.insertTx(tx);

      // tx failedInSign field should be updated to false
      const dbTxs = (await DatabaseActionMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.failedInSign,
      ]);
      expect(dbTxs).toEqual([[tx.txId, false]]);
    });
  });
});
