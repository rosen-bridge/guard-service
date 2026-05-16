import { TransactionType } from '@rosen-chains/abstract-chain';

import EventSerializer from '../../src/event/eventSerializer';
import { UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import * as TxTestData from '../agreement/testData';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import * as EventTestData from '../event/testData';
import TestUtils from '../testUtils/testUtils';
import TestPublicStatusHandler from './testPublicStatusHandler';

describe('PublicStatusHandler', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  describe('updatePublicEventStatus', () => {
    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inPayment"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inPayment" status in database
     * - insert a mock "payment" transaction in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto containing the payment tx
     */
    it('should call submitRequest with event and tx info when status is "inPayment"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.approved,
      );
      const tx =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, event.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: event.status,
        tx: {
          txId: tx.txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus: tx.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with a valid payment tx when event status is inPayment
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inPayment" status in database
     * - insert 2 mock "payment" transactions with "invalid" and "approved" statuses in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the valid "payment" tx
     */
    it('should call submitRequest with a valid payment tx when event status is inPayment', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inPayment,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx1 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx1,
        TransactionStatus.invalid,
      );

      const paymentTx2 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx2,
        TransactionStatus.approved,
      );
      const tx2 =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx2.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, event.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: event.status,
        tx: {
          txId: tx2.txId,
          chain: tx2.chain,
          txType: tx2.type,
          txStatus: tx2.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with a reward tx when event status is inReward
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inReward" status in database
     * - insert 2 mock transactions with "payment" and "reward" types in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the "reward" tx
     */
    it('should call submitRequest with a reward tx when event status is inReward', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx1 = TxTestData.mockPaymentTransaction(
        TransactionType.payment,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx1,
        TransactionStatus.completed,
      );

      const paymentTx2 = TxTestData.mockPaymentTransaction(
        TransactionType.reward,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx2,
        TransactionStatus.approved,
      );
      const tx2 =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx2.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, event.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: event.status,
        tx: {
          txId: tx2.txId,
          chain: tx2.chain,
          txType: tx2.type,
          txStatus: tx2.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest without transaction details when status is neither "inPayment" nor "inReward"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock eventId
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status that is not "inPayment" or "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once without a transaction property
     */
    it('should call submitRequest without transaction details when status is neither "inPayment" nor "inReward"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const eventId = TestUtils.generateRandomId();

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      const status = EventStatus.pendingPayment;
      await instance.updatePublicEventStatus(eventId, status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status,
        tx: undefined,
      });
    });
  });

  describe('updatePublicTxStatus', () => {
    /**
     * @target PublicStatusHandler.updatePublicTxStatus should call submitRequest with a dto object containing transaction details
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - insert a mock event with "inReward" status in database
     * - insert a mock "reward" transaction in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicTxStatus with the tx status
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the tx details
     */
    it('should call submitRequest with a dto object containing transaction details', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const mockedEvent = EventTestData.mockEventTrigger().event;
      const eventId = EventSerializer.getId(mockedEvent);
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.inReward,
      );
      const event =
        await DatabaseActionMock.testDatabase.ConfirmedEventRepository.findOneOrFail(
          {
            relations: ['eventData'],
            where: { id: eventId },
          },
        );

      const paymentTx = TxTestData.mockPaymentTransaction(
        TransactionType.reward,
        event.eventData.toChain,
        eventId,
      );
      await DatabaseActionMock.insertTxRecord(
        paymentTx,
        TransactionStatus.inSign,
      );
      const tx =
        await DatabaseActionMock.testDatabase.TransactionRepository.findOneOrFail(
          {
            where: { txId: paymentTx.txId },
          },
        );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicTxStatus(tx.txId, tx.status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: event.status,
        tx: {
          txId: tx.txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus: tx.status,
        },
      });
    });
  });

  describe('dtoToSignMessage', () => {
    /**
     * @target PublicStatusHandler.dtoToSignMessage should return a sign message without tx information when dto.tx field is undefined
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock UpdateStatusDTO object
     * - call PublicStatusHandler.dtoToSignMessage with the dto
     * @expected
     * - should have returned the string sign message
     */
    it('should return a sign message without tx information when dto.tx field is undefined', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const dto: UpdateStatusDTO = {
        eventId: TestUtils.generateRandomId(),
        status: EventStatus.inPayment,
      };

      // act
      const result = instance.callDTOToSignMessage(dto, 0);

      // assert
      expect(result).toBe(`${dto.eventId}${dto.status}0`);
    });

    /**
     * @target PublicStatusHandler.dtoToSignMessage should return a sign message with tx information when dto contains a tx
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock UpdateStatusDTO object
     * - call PublicStatusHandler.dtoToSignMessage with the dto
     * @expected
     * - should have returned the string sign message also containing the tx info
     */
    it('should return a sign message with tx information when dto contains a tx', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const dto: UpdateStatusDTO = {
        eventId: TestUtils.generateRandomId(),
        status: EventStatus.inPayment,
        tx: {
          txId: 'txId',
          chain: 'chain',
          txType: TransactionType.payment,
          txStatus: TransactionStatus.approved,
        },
      };

      // act
      const result = instance.callDTOToSignMessage(dto, 0);

      // assert
      expect(result).toBe(
        `${dto.eventId}${dto.status}${dto.tx!.txId}${dto.tx!.chain}${
          dto.tx!.txType
        }${dto.tx!.txStatus}0`,
      );
    });
  });
});
