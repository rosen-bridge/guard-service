import RequestVerifier from '../../src/verification/RequestVerifier';
import {
  feeRatioDivisor,
  mockEventTrigger,
  rsnRatioDivisor,
} from '../event/testData';
import { TransactionType } from '@rosen-chains/abstract-chain';
import { mockPaymentTransaction } from '../agreement/testData';
import EventSerializer from '../../src/event/EventSerializer';
import { mockGetEventFeeConfig } from '../event/mocked/MinimumFee.mock';
import {
  mockIsEventConfirmedEnough,
  mockIsEventPendingToType,
  mockVerifyEvent,
} from './mocked/EventVerifier.mock';
import TransactionVerifier from '../../src/verification/TransactionVerifier';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';

describe('RequestVerifier', () => {
  describe('verifyEventTransactionRequest', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
        rsnRatioDivisor,
        feeRatioDivisor,
      });
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return true
     * when all conditions for payment tx are met
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions for payment tx are met', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when event is not found
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event is not found', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when event is not confirmed enough
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event is not confirmed enough', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(false);
      mockVerifyEvent(true);
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when event is not verified
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event is not verified', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(false);
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when event has already payment tx and pending reward
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event has already payment tx and pending reward', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);
      mockIsEventPendingToType(false);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when event has already active tx
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and two transactions
     * - insert mocked event and transaction into db
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when event has already active tx', async () => {
      // mock event and two transactions
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );
      const inProgressTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // insert mocked event and transaction into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );
      await DatabaseActionMock.insertTxRecord(
        inProgressTx,
        TransactionStatus.signFailed
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when transaction doesn't satisfy the event
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it("should return false when transaction doesn't satisfy the event", async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent)
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment
      );

      // mock EventVerifier
      mockIsEventConfirmedEnough(true);
      mockVerifyEvent(true);
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        false
      );

      // run test
      const result = await RequestVerifier.verifyEventTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyColdStorageTransactionRequest', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      mockGetEventFeeConfig({
        bridgeFee: 0n,
        networkFee: 0n,
        rsnRatio: 0n,
        feeRatio: 100n,
        rsnRatioDivisor,
        feeRatioDivisor,
      });
    });

    /**
     * @target RequestVerifier.verifyColdStorageTransactionRequest should return true
     * when all conditions are met
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock transaction
     * - insert another cold storage transaction into db (different chain)
     * - mock TransactionVerifier.verifyColdStorageTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions are met', async () => {
      // mock transaction
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );

      // insert another cold storage transaction into db (different chain)
      const anotherTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        'chain-2',
        ''
      );
      await DatabaseActionMock.insertTxRecord(
        anotherTx,
        TransactionStatus.approved
      );

      // mock TransactionVerifier.verifyColdStorageTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyColdStorageTransaction'
      ).mockResolvedValue(true);

      // run test
      const result = await RequestVerifier.verifyColdStorageTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target RequestVerifier.verifyColdStorageTransactionRequest should return false
     * when there is already an active cold storage tx for chain in db
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock transaction
     * - insert another cold storage transaction into db (same chain)
     * - mock TransactionVerifier.verifyColdStorageTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when there is already an active cold storage tx for chain in db', async () => {
      // mock event and transaction
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );

      // insert another cold storage transaction into db (different chain)
      const anotherTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );
      await DatabaseActionMock.insertTxRecord(
        anotherTx,
        TransactionStatus.approved
      );

      // mock TransactionVerifier.verifyColdStorageTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyColdStorageTransaction'
      ).mockResolvedValue(true);

      // run test
      const result = await RequestVerifier.verifyColdStorageTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyColdStorageTransactionRequest should return false
     * when transaction doesn't satisfy cold storage tx conditions
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock transaction
     * - mock TransactionVerifier.verifyColdStorageTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it("should return false when transaction doesn't satisfy cold storage tx conditions", async () => {
      // mock transaction
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        ''
      );

      // mock TransactionVerifier.verifyColdStorageTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyColdStorageTransaction'
      ).mockResolvedValue(false);

      // run test
      const result = await RequestVerifier.verifyColdStorageTransactionRequest(
        paymentTx
      );

      // verify returned value
      expect(result).toEqual(false);
    });
  });
});
