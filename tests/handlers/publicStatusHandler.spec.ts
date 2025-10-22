import { TransactionType } from '@rosen-chains/abstract-chain';

import Configs from '../../src/configs/configs';
import { UpdateStatusDTO } from '../../src/handlers/publicStatusHandler';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import DatabaseActionMock from '../db/mocked/databaseAction.mock';
import {
  eventId,
  txId,
  chain,
  id0,
  mockPk,
  mockSignature,
  mockTx,
  signMessage,
} from './publicStatusHandler.testData';
import TestPublicStatusHandler from './testPublicStatusHandler';

describe('PublicStatusHandler', () => {
  beforeEach(async () => {
    await DatabaseActionMock.clearTables();
  });

  describe('submitRequest', () => {
    /**
     * @target PublicStatusHandler.submitRequest should submit successfully
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock UpdateStatusDTO object
     * - stub encryptor.getPk to resolve to a mock public key
     * - stub encryptor.sign to resolve to a mock signature
     * - call PublicStatusHandler.submitRequest with the mock DTO
     * @expected
     * - instance.dtoToSignMessageSpy should not have been called since axios is not initialized in tests
     * - encryptor.sign should not have been called since axios is not initialized in tests
     */
    it('should submit successfully', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(
        DatabaseActionMock.testDataSource,
      );

      const dto: UpdateStatusDTO = {
        date: 10,
        eventId,
        status: EventStatus.inPayment,
        tx: undefined,
      };

      vi.spyOn(Configs.tssKeys.encryptor, 'getPk').mockResolvedValue(mockPk);

      const signSpy = vi
        .spyOn(Configs.tssKeys.encryptor, 'sign')
        .mockResolvedValue(mockSignature);

      const dtoToSignMessageSpy = vi
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(instance as any, 'dtoToSignMessage')
        .mockReturnValue(signMessage);

      // act
      await instance.callSubmitRequest(dto);

      // assert
      expect(dtoToSignMessageSpy).not.toHaveBeenCalled();
      expect(signSpy).not.toHaveBeenCalled();
    });
  });

  describe('updatePublicEventStatus', () => {
    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inPayment"
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object
     * - insert the tx in database
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status set to "inPayment"
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
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, eventStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        date: expect.any(Number),
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
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object
     * - insert the tx in database
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status set to "inReward"
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
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, eventStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        date: expect.any(Number),
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
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status that is not "inPayment" or "inReward"
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
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        date: expect.any(Number),
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
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock TransactionEntity object
     * - insert the tx in database
     * - stub PublicStatusHandler.submitRequest to resolve
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
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicTxStatus(txId, newTxStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledExactlyOnceWith({
        date: expect.any(Number),
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
        date: 0,
        eventId: id0,
        status: EventStatus.inPayment,
      };

      // act
      const result = instance.callDTOToSignMessage(dto);

      // assert
      expect(result).toBe(`${dto.eventId}${dto.status}${dto.date}`);
    });

    /**
     * @target PublicStatusHandler.dtoToSignMessage should return a sign message with tx information when dto contains a tx
     * @dependencies
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
        date: 0,
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
      const result = instance.callDTOToSignMessage(dto);

      // assert
      expect(result).toBe(
        `${dto.eventId}${dto.status}${dto.tx!.txId}${dto.tx!.chain}${
          dto.tx!.txType
        }${dto.tx!.txStatus}${dto.date}`,
      );
    });
  });
});
