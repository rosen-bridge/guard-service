import { TransactionType } from '@rosen-chains/abstract-chain';

import { UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import {
  eventId,
  txId,
  chain,
  id0,
  mockTx,
  id1,
} from './publicStatusHandlerTestData';
import TestPublicStatusHandler from './testPublicStatusHandler';

describe('PublicStatusHandler', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  describe('updatePublicEventStatus', () => {
    /**
     * @target PublicStatusHandler.updatePublicEventStatus should sequentially call submitRequest for
     *  requests with matching eventsIds and handle different eventIds in parallel
     * @dependencies
     * @scenario
     * - mock the timers
     * - define a mock PublicStatusHandler with a mock dataSource
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve after 10ms
     * - call PublicStatusHandler.updatePublicEventStatus with 5 statuses for 2 different eventIds
     * - wait for the processing to finish
     * - check the submitRequestSpy
     * - check the size of tree
     * - restore the timers
     * @expected
     * - PublicStatusHandler.submitRequest should have been called 5 times with statuses of each eventId in the same order they were added
     * - tree size should have been 0
     */
    it('should sequentially call submitRequest for requests with matching eventsIds and handle different eventIds in parallel', async () => {
      // arrange
      vi.useFakeTimers();

      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );

      // act
      await instance.updatePublicEventStatus(id0, EventStatus.pendingPayment);
      await instance.updatePublicEventStatus(id1, EventStatus.pendingPayment);
      await instance.updatePublicEventStatus(id0, EventStatus.timeout);
      await instance.updatePublicEventStatus(id1, EventStatus.timeout);
      await instance.updatePublicEventStatus(id0, EventStatus.completed);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledTimes(2);
      expect(submitRequestSpy).toHaveBeenNthCalledWith(1, {
        eventId: id0,
        status: EventStatus.pendingPayment,
      });
      expect(submitRequestSpy).toHaveBeenNthCalledWith(2, {
        eventId: id1,
        status: EventStatus.pendingPayment,
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(submitRequestSpy).toHaveBeenCalledTimes(4);

      expect(submitRequestSpy).toHaveBeenNthCalledWith(3, {
        eventId: id0,
        status: EventStatus.timeout,
      });
      expect(submitRequestSpy).toHaveBeenNthCalledWith(4, {
        eventId: id1,
        status: EventStatus.timeout,
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(submitRequestSpy).toHaveBeenCalledTimes(5);

      expect(submitRequestSpy).toHaveBeenNthCalledWith(5, {
        eventId: id0,
        status: EventStatus.completed,
      });

      const tree = instance.processor.getTree();
      expect(tree.values.length).toBe(0);

      vi.useRealTimers();
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inPayment"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object
     * - insert the tx in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with event and tx info when status is "inPayment"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const eventStatus = EventStatus.inPayment;
      const txType = TransactionType.payment;
      const txStatus = TransactionStatus.sent;

      await DatabaseActionMock.testDatabase.EventRepository.insert(
        mockTx.event!.eventData,
      );
      await DatabaseActionMock.testDatabase.ConfirmedEventRepository.insert(
        mockTx.event!,
      );
      await DatabaseActionMock.testDatabase.TransactionRepository.insert({
        ...mockTx,
        type: txType,
        status: txStatus,
      });

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, eventStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: eventStatus,
        tx: {
          txId,
          chain,
          txType,
          txStatus,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inReward"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object
     * - insert the tx in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with event and tx info when status is "inReward"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const eventStatus = EventStatus.inReward;
      const txType = TransactionType.reward;
      const txStatus = TransactionStatus.inSign;

      await DatabaseActionMock.testDatabase.EventRepository.insert(
        mockTx.event!.eventData,
      );
      await DatabaseActionMock.testDatabase.ConfirmedEventRepository.insert(
        mockTx.event!,
      );
      await DatabaseActionMock.testDatabase.TransactionRepository.insert({
        ...mockTx,
        type: txType,
        status: txStatus,
      });

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, eventStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: eventStatus,
        tx: {
          txId,
          chain,
          txType,
          txStatus,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with the dto without transaction details when status is neither "inPayment" nor "inReward"
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status that is not "inPayment" or "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with the dto without transaction details when status is neither "inPayment" nor "inReward"', async () => {
      // arrange
      const status = EventStatus.pendingPayment;

      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
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
     * - define a mock TransactionEntity object
     * - insert the tx in database
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicTxStatus with the dto
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with a dto object containing transaction details', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const eventStatus = EventStatus.inReward;
      const txType = TransactionType.reward;
      const txStatus = TransactionStatus.inSign;
      const newTxStatus = TransactionStatus.signed;

      await DatabaseActionMock.testDatabase.EventRepository.insert(
        mockTx.event!.eventData,
      );
      await DatabaseActionMock.testDatabase.ConfirmedEventRepository.insert(
        mockTx.event!,
      );
      await DatabaseActionMock.testDatabase.TransactionRepository.insert({
        ...mockTx,
        type: txType,
        status: txStatus,
      });

      const submitRequestSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance.processor as any, 'jobFn')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicTxStatus(txId, newTxStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: eventStatus,
        tx: {
          txId,
          chain,
          txType,
          txStatus: newTxStatus,
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
        eventId: id0,
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
        eventId: id0,
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
