import { TransactionType } from '@rosen-chains/abstract-chain';

import { UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import {
  eventId,
  txId1,
  txId2,
  chain,
  mockTx,
} from './publicStatusHandlerTestData';
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
          txId: txId1,
          chain,
          txType,
          txStatus,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with a payment tx when event status is inPayment
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object with "payment" type
     * - define a mock transaction object with "reward" type
     * - insert the txs in database
     * - insert a mock event with "pendingPayment" status
     * - stub PublicStatusHandler.submitRequest (processor.jobFn) to resolve
     * - call PublicStatusHandler.updatePublicEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the "payment" tx
     */
    it('should call submitRequest with a payment tx when event status is inPayment', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const eventStatus = EventStatus.inPayment;
      const tx1 = {
        ...mockTx,
        type: TransactionType.payment,
        status: TransactionStatus.completed,
      };
      const tx2 = {
        ...mockTx,
        txId: txId2,
        type: TransactionType.reward,
        status: TransactionStatus.approved,
      };

      await DatabaseActionMock.testDatabase.EventRepository.insert(
        mockTx.event!.eventData,
      );
      await DatabaseActionMock.testDatabase.ConfirmedEventRepository.insert({
        ...mockTx.event!,
        status: EventStatus.pendingPayment,
      });
      await DatabaseActionMock.testDatabase.TransactionRepository.insert(tx1);
      await DatabaseActionMock.testDatabase.TransactionRepository.insert(tx2);

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
          txId: tx1.txId,
          chain: tx1.chain,
          txType: tx1.type,
          txStatus: tx1.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with a reward tx when event status is inReward
     * @dependencies
     * - Database
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object with "payment" type
     * - define a mock transaction object with "reward" type
     * - insert the txs in database
     * - insert a mock event with "inPayment" status
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

      const eventStatus = EventStatus.inReward;
      const tx1 = {
        ...mockTx,
        type: TransactionType.payment,
        status: TransactionStatus.completed,
      };
      const tx2 = {
        ...mockTx,
        txId: txId2,
        type: TransactionType.reward,
        status: TransactionStatus.approved,
      };

      await DatabaseActionMock.testDatabase.EventRepository.insert(
        mockTx.event!.eventData,
      );
      await DatabaseActionMock.testDatabase.ConfirmedEventRepository.insert({
        ...mockTx.event!,
        status: EventStatus.inPayment,
      });
      await DatabaseActionMock.testDatabase.TransactionRepository.insert(tx1);
      await DatabaseActionMock.testDatabase.TransactionRepository.insert(tx2);

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
          txId: tx2.txId,
          chain: tx2.chain,
          txType: tx2.type,
          txStatus: tx2.status,
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
      await instance.updatePublicTxStatus(txId1, newTxStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        eventId,
        status: eventStatus,
        tx: {
          txId: txId1,
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
        eventId,
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
        eventId,
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
