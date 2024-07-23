import DatabaseHandlerMock from './mocked/DatabaseAction.mock';
import EventSerializer from '../../src/event/EventSerializer';
import * as TxTestData from '../agreement/testData';
import * as EventTestData from '../event/testData';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseHandler from '../../src/db/DatabaseHandler';
import DatabaseActionMock from './mocked/DatabaseAction.mock';
import { rosenConfig } from '../../src/configs/RosenConfig';
import GuardsErgoConfigs from '../../src/configs/GuardsErgoConfigs';

describe('DatabaseHandler', () => {
  const requiredSign = 6;

  beforeEach(async () => {
    await DatabaseHandlerMock.clearTables();
  });

  describe('insertTx', () => {
    /**
     * @target DatabaseHandler.insertTx should throw error when event is not fou, requiredSignnd
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
      const tx = TxTestData.mockPaymentTransaction(TransactionType.payment);

      // run test and expect exception thrown
      await expect(async () => {
        await DatabaseHandler.insertTx(tx, requiredSign);
      }).rejects.toThrow(Error);
    });
  });

  describe('insertEventTx', () => {
    /**
     * @target DatabaseHandler.insertEventTx should insert tx when
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
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );

      // insert mocked event into db
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // run test
      await DatabaseHandler.insertTx(tx, requiredSign);

      // tx should be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event.id,
      ]);
      expect(dbTxs).toEqual([[tx.txId, eventId]]);
    });

    /**
     * @target DatabaseHandler.insertEventTx should NOT insert tx when
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
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx1 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );
      const tx2 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );

      // insert mocked event into db
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert one of the txs into db
      await DatabaseHandlerMock.insertTxRecord(tx2, TransactionStatus.inSign);

      // run test
      await DatabaseHandler.insertTx(tx1, requiredSign);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([tx2.txId]);
    });

    /**
     * @target DatabaseHandler.insertEventTx should insert tx when
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
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const txs = [
        TxTestData.mockPaymentTransaction(
          TransactionType.payment,
          mockedEvent.toChain,
          eventId
        ),
        TxTestData.mockPaymentTransaction(
          TransactionType.payment,
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
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert tx with higher txId (with `approved` status)
      await DatabaseHandlerMock.insertTxRecord(
        highTx,
        TransactionStatus.approved
      );

      // run test
      await DatabaseHandler.insertTx(lowTx, requiredSign);

      // tx should be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseHandler.insertEventTx should NOT insert tx when
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
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const txs = [
        TxTestData.mockPaymentTransaction(
          TransactionType.payment,
          mockedEvent.toChain,
          eventId
        ),
        TxTestData.mockPaymentTransaction(
          TransactionType.payment,
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
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // insert tx with lower txId (with `approved` status)
      await DatabaseHandlerMock.insertTxRecord(
        lowTx,
        TransactionStatus.approved
      );

      // run test
      await DatabaseHandler.insertTx(highTx, requiredSign);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseHandler.insertEventTx should update failedInSign when
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
      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      const tx = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        eventId
      );

      // insert mocked event and transaction into db
      await DatabaseHandlerMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );
      await DatabaseHandlerMock.insertTxRecord(tx, TransactionStatus.approved);

      // run test
      await DatabaseHandler.insertTx(tx, requiredSign);

      // tx failedInSign field should be updated to false
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.failedInSign,
      ]);
      expect(dbTxs).toEqual([[tx.txId, false]]);
    });
  });

  describe('insertColdStorageTx', () => {
    /**
     * @target DatabaseHandler.insertColdStorageTx should insert tx when
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
    it('should insert tx when there is no other tx for the chain', async () => {
      // mock transaction
      const chain = 'chain';
      const tx = TxTestData.mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );

      // run test
      await DatabaseHandler.insertTx(tx, requiredSign);

      // tx should be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.event,
        tx.chain,
      ]);
      expect(dbTxs).toEqual([[tx.txId, null, tx.network]]);
    });

    /**
     * @target DatabaseHandler.insertColdStorageTx should insert tx when
     * there is invalid tx for the chain
     * @dependencies
     * - database
     * @scenario
     * - mock transaction
     * - run test (call `insertTx`)
     * - check database
     * @expected
     * - tx should be inserted into db
     */
    it('should insert tx when there is invalid tx for the chain', async () => {
      // mock transaction
      const chain = 'chain';
      const tx = TxTestData.mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );
      const tx2 = TxTestData.mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );

      // insert one of the txs into db
      await DatabaseHandlerMock.insertTxRecord(tx2, TransactionStatus.invalid);

      // run test
      await DatabaseHandler.insertTx(tx, requiredSign);

      // tx should be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords())
        .filter((tx) => tx.txId !== tx2.txId)
        .map((tx) => [tx.txId, tx.event, tx.chain]);
      expect(dbTxs).toEqual([[tx.txId, null, tx.network]]);
    });

    /**
     * @target DatabaseHandler.insertColdStorageTx should NOT insert tx when
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
        TransactionType.coldStorage,
        chain,
        ''
      );
      const tx2 = TxTestData.mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );

      // insert one of the txs into db
      await DatabaseHandlerMock.insertTxRecord(tx2, TransactionStatus.inSign);

      // run test
      await DatabaseHandler.insertTx(tx1, requiredSign);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([tx2.txId]);
    });

    /**
     * @target DatabaseHandler.insertColdStorageTx should insert tx when
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
          TransactionType.coldStorage,
          chain,
          ''
        ),
        TxTestData.mockPaymentTransaction(
          TransactionType.coldStorage,
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
      await DatabaseHandlerMock.insertTxRecord(
        highTx,
        TransactionStatus.approved
      );

      // run test
      await DatabaseHandler.insertTx(lowTx, requiredSign);

      // tx should be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseHandler.insertColdStorageTx should NOT insert tx when
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
          TransactionType.coldStorage,
          chain,
          ''
        ),
        TxTestData.mockPaymentTransaction(
          TransactionType.coldStorage,
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
      await DatabaseHandlerMock.insertTxRecord(
        lowTx,
        TransactionStatus.approved
      );

      // run test
      await DatabaseHandler.insertTx(highTx, requiredSign);

      // tx should NOT be inserted into db
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map(
        (tx) => tx.txId
      );
      expect(dbTxs).toEqual([lowTx.txId]);
    });

    /**
     * @target DatabaseHandler.insertColdStorageTx should update failedInSign when
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
        TransactionType.coldStorage,
        chain,
        ''
      );

      // insert mocked transaction into db
      await DatabaseHandlerMock.insertTxRecord(tx, TransactionStatus.approved);

      // run test
      await DatabaseHandler.insertTx(tx, requiredSign);

      // tx failedInSign field should be updated to false
      const dbTxs = (await DatabaseHandlerMock.allTxRecords()).map((tx) => [
        tx.txId,
        tx.failedInSign,
      ]);
      expect(dbTxs).toEqual([[tx.txId, false]]);
    });
  });

  describe('getWaitingEventsRequiredTokens', () => {
    /**
     * @target DatabaseHandler.getWaitingEventsRequiredTokens should
     * return correct list for `paymentWaiting` events on non-Ergo chains
     * @dependencies
     * - database
     * @scenario
     * - mock an event with non-Ergo chain as target chain
     * - insert mocked event into db as paymentWaiting
     * - run test
     * - check returned value
     * @expected
     * - returned list should only have event targetChainTokenId
     */
    it('should return correct list for `paymentWaiting` events on non-Ergo chains', async () => {
      const event = EventTestData.mockEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const result = await DatabaseHandler.getWaitingEventsRequiredTokens();
      expect(result).toEqual([event.targetChainTokenId]);
    });

    /**
     * @target DatabaseHandler.getWaitingEventsRequiredTokens should
     * return correct list for `paymentWaiting` events on Ergo
     * @dependencies
     * - database
     * @scenario
     * - mock an event with Ergo as target chain
     * - insert mocked event into db as paymentWaiting
     * - run test
     * - check returned value
     * @expected
     * - returned list should have event targetChainTokenId and emissionToken
     */
    it('should return correct list for `paymentWaiting` events on Ergo', async () => {
      const event = EventTestData.mockToErgoEventTrigger().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.paymentWaiting
      );

      const result = await DatabaseHandler.getWaitingEventsRequiredTokens();
      expect(result).toEqual([
        event.targetChainTokenId,
        GuardsErgoConfigs.emissionTokenId,
      ]);
    });

    /**
     * @target DatabaseHandler.getWaitingEventsRequiredTokens should
     * return correct list for `rewardWaiting` events
     * @dependencies
     * - database
     * @scenario
     * - mock an event
     * - insert mocked event into db as rewardWaiting
     * - run test
     * - check returned value
     * @expected
     * - returned list should have event targetChainTokenId and emissionToken
     */
    it('should return correct list for `rewardWaiting` events', async () => {
      const event = EventTestData.mockTokenPaymentFromErgoEvent().event;
      await DatabaseActionMock.insertEventRecord(
        event,
        EventStatus.rewardWaiting
      );

      const result = await DatabaseHandler.getWaitingEventsRequiredTokens();
      expect(result).toEqual([
        GuardsErgoConfigs.emissionTokenId,
        event.sourceChainTokenId,
      ]);
    });
  });
});
