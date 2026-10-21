import {
  ChainUtils,
  PaymentOrder,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { TransactionType as BchConsumers_TransactionType } from '@rosen-chains/abstract-chain';
import { ERGO_CHAIN } from '@rosen-chains/ergo';

import EventSerializer from '../../src/event/eventSerializer';
import BchConsumers_EventSerializer from '../../src/event/eventSerializer';
import BchConsumers_ChainHandler from '../../src/handlers/chainHandler';
import {
  EventStatus,
  OrderStatus,
  TransactionStatus,
} from '../../src/utils/constants';
import Utils from '../../src/utils/utils';
import RequestVerifier from '../../src/verification/requestVerifier';
import BchConsumers_RequestVerifier from '../../src/verification/requestVerifier';
import TransactionVerifier from '../../src/verification/transactionVerifier';
import BchConsumers_TransactionVerifier from '../../src/verification/transactionVerifier';
import { mockPaymentTransaction } from '../agreement/testData';
import { mockPaymentTransaction as BchConsumers_mockPaymentTransaction } from '../agreement/testData';
import {
  insertNamespaceEvent as BchConsumers_insertNamespaceEvent,
  namespaceEvent as BchConsumers_namespaceEvent,
} from '../db/bitcoinCashNamespaceTestUtils';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import BchConsumers_DatabaseActionMock from '../db/mocked/databaseAction.mock';
import { mockGetEventFeeConfig } from '../event/mocked/minimumFee.mock';
import {
  feeRatioDivisor,
  mockEventTrigger,
  rsnRatioDivisor,
} from '../event/testData';
import { chainHandlerInstance as BchConsumers_chainHandlerInstance } from '../handlers/chainHandler.mock';
import EventSynchronizationMock from '../synchronization/mocked/eventSynchronization.mock';
import { preserveBitcoinCashMocks } from '../testUtils/mocked/bitcoinCashMockScope.mock';
import TestUtils from '../testUtils/testUtils';
import { mockIsEventPendingToType } from './mocked/eventVerifier.mock';

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
      EventSynchronizationMock.resetMock();
      EventSynchronizationMock.mock();
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
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

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
        EventSerializer.getId(mockedEvent),
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when transaction network is incompatible with the event
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction network is incompatible with the event', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        'chain',
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when reward tx is not on Ergo
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventVerifier
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when reward tx is not on Ergo', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        TransactionType.reward,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingReward,
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false
     * when transaction type is invalid
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
    it('should return false when transaction type is invalid', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const paymentTx = mockPaymentTransaction(
        'invalid-tx-type',
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyEventTransactionRequest should return false and add event
     * to synchronization queue when reward transaction is received while event is pending payment transaction
     * @dependencies
     * - EventVerifier
     * - MinimumFee
     * - TransactionVerifier
     * - EventSynchronization
     * - database
     * @scenario
     * - mock event and transaction
     * - insert mocked event into db
     * - mock EventSynchronization.addEventToQueue
     * - mock EventVerifier
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyEventTransaction
     * - run test
     * - verify returned value
     * - check if function got called
     * @expected
     * - returned value should be false
     * - `addEventToQueue` should got called with the mocked event id
     */
    it('should return false and add event to synchronization queue when reward transaction is received while event is pending payment transaction', async () => {
      // mock event and transaction
      const mockedEvent = mockEventTrigger().event;
      const mockedEventId = Utils.txIdToEventId(mockedEvent.sourceTxId);
      const paymentTx = mockPaymentTransaction(
        TransactionType.reward,
        ERGO_CHAIN,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock EventSynchronization.addEventToQueue
      EventSynchronizationMock.mockAddEventToQueue();

      // mock EventVerifier
      mockIsEventPendingToType(false);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);

      // `addEventToQueue` should got called
      expect(
        EventSynchronizationMock.getMockedFunction('addEventToQueue'),
      ).toHaveBeenCalledWith(mockedEventId);
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
        EventSerializer.getId(mockedEvent),
      );
      const inProgressTx = mockPaymentTransaction(
        TransactionType.payment,
        mockedEvent.toChain,
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event and transaction into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );
      await DatabaseActionMock.insertTxRecord(
        inProgressTx,
        TransactionStatus.signFailed,
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        true,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

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
        EventSerializer.getId(mockedEvent),
      );

      // insert mocked event into db
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
      );

      // mock EventVerifier
      mockIsEventPendingToType(true);

      // mock TransactionVerifier.verifyEventTransaction
      vi.spyOn(TransactionVerifier, 'verifyEventTransaction').mockResolvedValue(
        false,
      );

      // run test
      const result =
        await RequestVerifier.verifyEventTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    describe('BCH RCS bitcoinCashNamespaceConsumers', () => {
      let restoreBchMocks: () => void;
      beforeEach(() => {
        restoreBchMocks = preserveBitcoinCashMocks([
          [BchConsumers_ChainHandler, ['getInstance']],
          [BchConsumers_TransactionVerifier, ['verifyEventTransaction']],
        ]);
      });
      afterEach(() => restoreBchMocks());

      beforeEach(async () => {
        await BchConsumers_DatabaseActionMock.clearTables();
        vi.spyOn(BchConsumers_ChainHandler, 'getInstance').mockReturnValue(
          BchConsumers_chainHandlerInstance as unknown as BchConsumers_ChainHandler,
        );
      });

      /**
       * @target RequestVerifier.verifyEventTransactionRequest - resolves the
       * BCH request to BCH despite the colliding BTC request ID
       * @dependencies SQLite namespace fixtures,
       * TestTxAgreement/TestEventSynchronization wrappers, mocked chain, fee,
       * order, verification and active-sync seams.
       * @scenario resolves the BCH request to BCH despite the colliding BTC
       * request ID.
       * @expected Verify the BCH request with BCH source data; reject its wire
       * request hash as a guard identity.
       */
      it('resolves the BCH request to BCH despite the colliding BTC request ID', async () => {
        await BchConsumers_insertNamespaceEvent(
          BchConsumers_namespaceEvent('bitcoin', { toChain: 'cardano' }),
          'btc-trigger',
        );
        const bch = await BchConsumers_insertNamespaceEvent(
          BchConsumers_namespaceEvent('bitcoin-cash', { toChain: 'cardano' }),
          'bch-trigger',
        );
        const verify = vi
          .spyOn(BchConsumers_TransactionVerifier, 'verifyEventTransaction')
          .mockImplementation(
            async (_tx, event) => event.fromChain === 'bitcoin-cash',
          );
        const tx = BchConsumers_mockPaymentTransaction(
          BchConsumers_TransactionType.payment,
          'cardano',
          BchConsumers_EventSerializer.getId(bch),
        );
        expect(
          await BchConsumers_RequestVerifier.verifyEventTransactionRequest(tx),
        ).toEqual(true);
        expect(verify).toHaveBeenCalledWith(
          tx,
          expect.objectContaining({ fromChain: 'bitcoin-cash' }),
          bch.txId,
        );
        tx.eventId = bch.eventId;
        expect(
          await BchConsumers_RequestVerifier.verifyEventTransactionRequest(tx),
        ).toEqual(false);
      });
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
        '',
      );

      // insert another cold storage transaction into db (different chain)
      const anotherTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        'chain-2',
        '',
      );
      await DatabaseActionMock.insertTxRecord(
        anotherTx,
        TransactionStatus.approved,
      );

      // mock TransactionVerifier.verifyColdStorageTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyColdStorageTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyColdStorageTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target RequestVerifier.verifyColdStorageTransactionRequest should return false
     * when requested tx has eventId
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
     * - returned value should be false
     */
    it('should return false when requested tx has eventId', async () => {
      // mock transaction
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        chain,
        'eventId',
      );

      // insert another cold storage transaction into db (different chain)
      const anotherTx = mockPaymentTransaction(
        TransactionType.coldStorage,
        'chain-2',
        '',
      );
      await DatabaseActionMock.insertTxRecord(
        anotherTx,
        TransactionStatus.approved,
      );

      // mock TransactionVerifier.verifyColdStorageTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyColdStorageTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyColdStorageTransactionRequest(paymentTx);

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
        '',
      );

      // mock TransactionVerifier.verifyColdStorageTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyColdStorageTransaction',
      ).mockResolvedValue(false);

      // run test
      const result =
        await RequestVerifier.verifyColdStorageTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });
  });

  describe('verifyArbitraryTransactionRequest', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target RequestVerifier.verifyArbitraryTransactionRequest should return true
     * when all conditions are met
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock order and transaction
     * - insert mocked order into db
     * - mock TransactionVerifier.verifyArbitraryTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when all conditions are met', async () => {
      // mock order and transaction
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const orderId = TestUtils.generateRandomId();
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.payment,
        chain,
        orderId,
      );

      // insert mocked order into db
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        ChainUtils.encodeOrder(mockedOrder),
        OrderStatus.pending,
      );

      // mock TransactionVerifier.verifyArbitraryTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyArbitraryTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyArbitraryTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(true);
    });

    /**
     * @target RequestVerifier.verifyArbitraryTransactionRequest should return false
     * when order is not found
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock transaction
     * - mock EventVerifier
     *   - mock `isEventConfirmedEnough`
     *   - mock `verifyEvent`
     *   - mock `isEventPendingToType`
     * - mock TransactionVerifier.verifyArbitraryTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when order is not found', async () => {
      // mock transaction
      const orderId = TestUtils.generateRandomId();
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );

      // mock TransactionVerifier.verifyArbitraryTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyArbitraryTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyArbitraryTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyArbitraryTransactionRequest should return false
     * when transaction network is differ from order chain
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock order and transaction
     * - insert mocked order into db
     * - mock TransactionVerifier.verifyArbitraryTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when transaction network is differ from order chain', async () => {
      // mock order and transaction
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const orderId = TestUtils.generateRandomId();
      const paymentTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        'chain-1',
        orderId,
      );

      // insert mocked order into db
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        'chain-2',
        ChainUtils.encodeOrder(mockedOrder),
        OrderStatus.pending,
      );

      // mock TransactionVerifier.verifyArbitraryTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyArbitraryTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyArbitraryTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyArbitraryTransactionRequest should return false
     * when order has already an active tx
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock order and transaction
     * - insert mocked transaction and order into db
     * - mock TransactionVerifier.verifyArbitraryTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when order has already an active tx', async () => {
      // mock order and transaction
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const orderId = TestUtils.generateRandomId();
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );
      const inProgressTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );

      // insert mocked transaction and order into db
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        ChainUtils.encodeOrder(mockedOrder),
        OrderStatus.pending,
      );
      await DatabaseActionMock.insertTxRecord(
        inProgressTx,
        TransactionStatus.signFailed,
      );

      // mock TransactionVerifier.verifyArbitraryTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyArbitraryTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyArbitraryTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyArbitraryTransactionRequest should return false
     * when order is not pending transaction
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock order and transaction
     * - insert mocked order into db
     * - mock TransactionVerifier.verifyArbitraryTransaction
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it('should return false when order is not pending transaction', async () => {
      // mock order and transaction
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const orderId = TestUtils.generateRandomId();
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );

      // insert mocked order into db
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        ChainUtils.encodeOrder(mockedOrder),
        OrderStatus.reachedLimit,
      );

      // mock TransactionVerifier.verifyArbitraryTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyArbitraryTransaction',
      ).mockResolvedValue(true);

      // run test
      const result =
        await RequestVerifier.verifyArbitraryTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });

    /**
     * @target RequestVerifier.verifyArbitraryTransactionRequest should return false
     * when transaction doesn't satisfy the order
     * @dependencies
     * - TransactionVerifier
     * - database
     * @scenario
     * - mock order and transaction
     * - insert mocked order into db
     * - mock TransactionVerifier.verifyArbitraryTransaction to return false
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be false
     */
    it("should return false when transaction doesn't satisfy the order", async () => {
      // mock order and transaction
      const mockedOrder: PaymentOrder = [
        {
          address: 'address',
          assets: {
            nativeToken: 10n,
            tokens: [],
          },
        },
      ];
      const orderId = TestUtils.generateRandomId();
      const chain = 'chain';
      const paymentTx = mockPaymentTransaction(
        TransactionType.arbitrary,
        chain,
        orderId,
      );

      // insert mocked order into db
      await DatabaseActionMock.insertOrderRecord(
        orderId,
        chain,
        ChainUtils.encodeOrder(mockedOrder),
        OrderStatus.pending,
      );

      // mock TransactionVerifier.verifyArbitraryTransaction
      vi.spyOn(
        TransactionVerifier,
        'verifyArbitraryTransaction',
      ).mockResolvedValue(false);

      // run test
      const result =
        await RequestVerifier.verifyArbitraryTransactionRequest(paymentTx);

      // verify returned value
      expect(result).toEqual(false);
    });
  });
});
