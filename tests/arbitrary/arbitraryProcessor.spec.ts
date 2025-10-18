import { MockInstance } from 'vitest';

import {
  NotEnoughAssetsError,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ErgoTransaction, ERGO_CHAIN } from '@rosen-chains/ergo';

import Configs from '../../src/configs/configs';
import { OrderStatus } from '../../src/utils/constants';
import TxAgreementMock from '../agreement/mocked/txAgreement.mock';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import ChainHandlerMock from '../handlers/chainHandler.mock';
import NotificationHandlerMock from '../handlers/notificationHandler.mock';
import TestConfigs from '../testUtils/testConfigs';
import { mockGuardTurn } from '../utils/mocked/guardTurn.mock';
import TestArbitraryProcessor from './testArbitraryProcessor';
import { order, orderJson } from './testData';

describe(`TestArbitraryProcessor`, () => {
  describe(`processArbitraryOrders`, () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createOrderPaymentSpy: MockInstance<any>;
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
      TxAgreementMock.resetMock();
      TxAgreementMock.mock();
      NotificationHandlerMock.resetMock();
      NotificationHandlerMock.mock();
    });

    /**
     * @target ArbitraryProcessor.processArbitraryOrders should do nothing
     * when turn is over
     * @dependencies
     * - database
     * - ArbitraryProcessor
     * - GuardTurn
     * @scenario
     * - mock a pending order and insert into db
     * - mock `createOrderPayment`
     * - mock GuardTurn to return guard index + 1
     * - run test
     * - check if function got called
     * @expected
     * - `createOrderPayment` should NOT got called
     */
    it('should do nothing when turn is over', async () => {
      // mock a pending order and insert into db
      await DatabaseActionMock.insertOrderRecord(
        'id',
        'chain',
        orderJson,
        OrderStatus.pending,
      );

      // mock `createOrderPayment`
      const arbitraryProcessor = new TestArbitraryProcessor();
      const mockedProcessor = vi.fn();
      createOrderPaymentSpy = vi.spyOn(
        arbitraryProcessor,
        'createOrderPayment',
      );
      createOrderPaymentSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index + 1
      mockGuardTurn(TestConfigs.guardIndex + 1);

      // run test
      await arbitraryProcessor.processArbitraryOrders();

      // `createOrderPayment` should NOT got called
      expect(mockedProcessor).not.toHaveBeenCalled();
    });

    /**
     * @target ArbitraryProcessor.processArbitraryOrders should update arbitrary order
     * status to reached-limit when too much txs of the arbitrary order are failed
     * @dependencies
     * - database
     * - ArbitraryProcessor
     * - GuardTurn
     * @scenario
     * - mock a pending order and insert into db
     * - mock `createOrderPayment`
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * - check status of arbitrary orders in db
     * @expected
     * - `createOrderPayment` should NOT got called
     * - order status should be updated to reached-limit
     */
    it('should update arbitrary order status to reached-limit when too much txs of the arbitrary order are failed', async () => {
      // mock a pending order and insert into db
      await DatabaseActionMock.insertOrderRecord(
        'id',
        'chain',
        orderJson,
        OrderStatus.pending,
        undefined,
        1,
      );

      // mock `createOrderPayment`
      const arbitraryProcessor = new TestArbitraryProcessor();
      const mockedProcessor = vi.fn();
      createOrderPaymentSpy = vi.spyOn(
        arbitraryProcessor,
        'createOrderPayment',
      );
      createOrderPaymentSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      await arbitraryProcessor.processArbitraryOrders();

      // `createOrderPayment` should got called
      expect(mockedProcessor).not.toHaveBeenCalled();

      // order status should be updated to reached-limit
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.status],
      );
      expect(dbOrders).toContainEqual(['id', OrderStatus.reachedLimit]);
    });

    /**
     * @target ArbitraryProcessor.processArbitraryOrders should create transaction
     * for the order and send to TxAgreement queue
     * @dependencies
     * - database
     * - ArbitraryProcessor
     * - GuardTurn
     * - TxAgreement
     * @scenario
     * - mock a pending order and insert into db
     * - mock `createOrderPayment`
     * - mock GuardTurn to return guard index
     * - mock TxAgreement.addTransactionToQueue
     * - run test
     * - check if function got called
     * @expected
     * - `createOrderPayment` should got called
     * - `addTransactionToQueue` should got called
     */
    it('should create transaction for the order and send to TxAgreement queue', async () => {
      // mock a pending order and insert into db
      await DatabaseActionMock.insertOrderRecord(
        'id',
        'chain',
        orderJson,
        OrderStatus.pending,
      );

      // mock `createOrderPayment`
      const arbitraryProcessor = new TestArbitraryProcessor();
      const mockedProcessor = vi.fn();
      createOrderPaymentSpy = vi.spyOn(
        arbitraryProcessor,
        'createOrderPayment',
      );
      createOrderPaymentSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // mock TxAgreement.addTransactionToQueue
      TxAgreementMock.mockAddTransactionToQueue();

      // run test
      await arbitraryProcessor.processArbitraryOrders();

      // `createOrderPayment` should got called
      expect(mockedProcessor).toHaveBeenCalledOnce();

      // `addTransactionToQueue` should got called
      expect(
        TxAgreementMock.getMockedFunction('addTransactionToQueue'),
      ).toHaveBeenCalledOnce();
    });

    /**
     * @target ArbitraryProcessor.processArbitraryOrders should set order status
     * as waiting when there is not enough assets in the lock address
     * @dependencies
     * - database
     * - ArbitraryProcessor
     * - GuardTurn
     * @scenario
     * - mock a pending order and insert into db
     * - mock `createOrderPayment` to throw NotEnoughAssetsError
     * - mock GuardTurn to return guard index
     * - mock Notification
     * - run test
     * - check if function got called
     * - check status of arbitrary orders in db
     * @expected
     * - `createOrderPayment` should got called
     * - order status should be updated to waiting
     * - Notification `notify` should got called
     */
    it('should set order status as waiting when there is not enough assets in the lock address', async () => {
      // mock a pending order and insert into db
      await DatabaseActionMock.insertOrderRecord(
        'id',
        'chain',
        orderJson,
        OrderStatus.pending,
      );

      // mock `createOrderPayment`
      const arbitraryProcessor = new TestArbitraryProcessor();
      const mockedProcessor = vi
        .fn()
        .mockRejectedValue(
          new NotEnoughAssetsError(`test version of NotEnoughAssetsError`),
        );
      createOrderPaymentSpy = vi.spyOn(
        arbitraryProcessor,
        'createOrderPayment',
      );
      createOrderPaymentSpy.mockImplementation(mockedProcessor);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // mock Notification
      NotificationHandlerMock.mockNotify();

      // run test
      await arbitraryProcessor.processArbitraryOrders();

      // `createOrderPayment` should got called
      expect(mockedProcessor).toHaveBeenCalledOnce();

      // order status should be updated to reached-limit
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.status],
      );
      expect(dbOrders).toContainEqual(['id', OrderStatus.waiting]);

      // Notification `notify` should got called
      expect(
        NotificationHandlerMock.getNotificationHandlerMockedFunction('notify'),
      ).toHaveBeenCalledOnce();
    });
  });

  describe(`createOrderPayment`, () => {
    beforeEach(() => {
      ChainHandlerMock.resetMock();
      TxAgreementMock.resetMock();
      TxAgreementMock.mock();
    });

    /**
     * @target ArbitraryProcessor.createOrderPayment should create transaction
     * for the order on Ergo successfully
     * @dependencies
     * - ChainHandler
     * - TxAgreement
     * @scenario
     * - mock ChainHandler `getChain` for ergo
     *   - mock `getGuardsConfigBox`
     *   - mock `generateTransaction`
     * - mock TxAgreement.getChainPendingTransactions to return empty list
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateTransaction` should got called with expected arguments
     */
    it('should create transaction for the order on Ergo successfully', async () => {
      // mock ChainHandler
      ChainHandlerMock.mockChainName(ERGO_CHAIN);
      // mock `getGuardsConfigBox`
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'getGuardsConfigBox',
        'serialized-guard-box',
        true,
      );
      // mock `generateTransaction`
      const tx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'orderId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        }),
      );
      ChainHandlerMock.mockErgoFunctionReturnValue(
        'generateTransaction',
        tx,
        true,
      );

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      const arbitraryProcessor = new TestArbitraryProcessor();
      await arbitraryProcessor.createOrderPayment('id', order, ERGO_CHAIN);

      // `generateTransaction` should got called
      const mockedGenerateTransaction = ChainHandlerMock.getChainMockedFunction(
        ERGO_CHAIN,
        'generateTransaction',
      );
      expect(mockedGenerateTransaction).toHaveBeenCalledWith(
        'id',
        TransactionType.arbitrary,
        order,
        [],
        [],
        [],
        ['serialized-guard-box'],
      );
    });

    /**
     * @target ArbitraryProcessor.createOrderPayment should create transaction
     * for the order on a non-Ergo chain successfully
     * @dependencies
     * - ChainHandler
     * - TxAgreement
     * @scenario
     * - mock ChainHandler `getChain` for cardano
     *   - mock `generateTransaction`
     * - mock TxAgreement.getChainPendingTransactions to return empty list
     * - mock GuardTurn to return guard index
     * - run test
     * - check if function got called
     * @expected
     * - `generateTransaction` should got called with expected arguments
     */
    it('should create transaction for the order on a non-Ergo chain successfully', async () => {
      // mock ChainHandler
      ChainHandlerMock.mockChainName(CARDANO_CHAIN);
      // mock `generateTransaction`
      const tx = ErgoTransaction.fromJson(
        JSON.stringify({
          network: 'network',
          txId: 'txId',
          eventId: 'orderId',
          txBytes: Buffer.from('txBytes'),
          txType: 'txType',
          inputBoxes: [],
          dataInputs: [],
        }),
      );
      ChainHandlerMock.mockChainFunction(
        CARDANO_CHAIN,
        'generateTransaction',
        tx,
        true,
      );

      // mock txAgreement pending transactions
      TxAgreementMock.mockGetChainPendingTransactions([]);

      // mock GuardTurn to return guard index
      mockGuardTurn(TestConfigs.guardIndex);

      // run test
      const arbitraryProcessor = new TestArbitraryProcessor();
      await arbitraryProcessor.createOrderPayment('id', order, CARDANO_CHAIN);

      // `generateTransaction` should got called
      const mockedGenerateTransaction = ChainHandlerMock.getChainMockedFunction(
        CARDANO_CHAIN,
        'generateTransaction',
      );
      expect(mockedGenerateTransaction).toHaveBeenCalledWith(
        'id',
        TransactionType.arbitrary,
        order,
        [],
        [],
      );
    });
  });

  describe('TimeoutLeftoverOrders', () => {
    const currentTimeStamp = 1658005354291000;
    const dateSpy = vi.spyOn(Date, 'now');

    beforeAll(() => {
      // mock Date to return testing currentTimeStamp
      dateSpy.mockReturnValue(currentTimeStamp);
    });

    afterAll(() => {
      // reset mocked Date
      dateSpy.mockRestore();
    });

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target ArbitraryProcessor.TimeoutLeftoverOrders should mark orders as
     * timeout if enough seconds passed from firstTry
     * @dependencies
     * - database
     * - Date
     * @scenario
     * - mock two orders and insert into db (different in firstTry column)
     * - run test
     * - check status of orders in db
     * @expected
     * - status of one order should be updated in db
     */
    it('should mark orders as timeout if enough seconds passed from firstTry', async () => {
      // mock two orders and insert into db (different in firstTry column)
      const firstTry1 =
        Math.round(currentTimeStamp / 1000) - Configs.orderTimeout - 100;
      const firstTry2 =
        Math.round(currentTimeStamp / 1000) - Configs.orderTimeout + 100;
      await DatabaseActionMock.insertOrderRecord(
        'id-1',
        'chain',
        orderJson,
        OrderStatus.pending,
        String(firstTry1),
      );
      await DatabaseActionMock.insertOrderRecord(
        'id-2',
        'chain',
        orderJson,
        OrderStatus.pending,
        String(firstTry2),
      );

      // run test
      const arbitraryProcessor = new TestArbitraryProcessor();
      await arbitraryProcessor.timeoutLeftoverOrders();

      // status of one order should be updated in db
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.status],
      );
      expect(dbOrders.length).toEqual(2);
      expect(dbOrders).toContainEqual(['id-1', OrderStatus.timeout]);
      expect(dbOrders).toContainEqual(['id-2', OrderStatus.pending]);
    });
  });

  describe('RequeueWaitingOrders', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target ArbitraryProcessor.RequeueWaitingOrders should mark waiting orders as pending
     * @dependencies
     * - database
     * @scenario
     * - mock and insert an order into db with status waiting
     * - run test
     * - check status of orders in db
     * @expected
     * - status of the order should be updated in db
     */
    it('should mark waiting orders as pending', async () => {
      // mock and insert an order into db with status waiting
      await DatabaseActionMock.insertOrderRecord(
        'id',
        'chain',
        orderJson,
        OrderStatus.waiting,
      );

      // run test
      const arbitraryProcessor = new TestArbitraryProcessor();
      await arbitraryProcessor.requeueWaitingOrders();

      // status of two orders should be updated in db
      const dbOrders = (await DatabaseActionMock.allOrderRecords()).map(
        (order) => [order.id, order.status],
      );
      expect(dbOrders.length).toEqual(1);
      expect(dbOrders).toContainEqual(['id', OrderStatus.pending]);
    });
  });
});
