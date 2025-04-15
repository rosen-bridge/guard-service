import { DataSource } from 'typeorm';
import { TransactionType } from '@rosen-chains/abstract-chain';

import {
  UpdateStatusDTO,
  UpdateTxStatusDTO,
} from '../../src/handlers/PublicStatusHandler';
import Configs from '../../src/configs/Configs';
import { EventStatus, TransactionStatus } from '../../src/utils/constants';
import TestPublicStatusHandler from './TestPublicStatusHandler';
import { TransactionEntity } from '../../src/db/entities/TransactionEntity';
import { ConfirmedEventEntity } from '../../src/db/entities/ConfirmedEventEntity';
import { id0 } from './testData';

vi.mock('axios', () => ({
  axios: {
    create: vi.fn().mockReturnValue({
      post: vi.fn().mockResolvedValue({}),
    }),
  },
}));

describe('PublicStatusHandler', () => {
  const mockRepository = {
    findOne: vi.fn(),
  };
  const mockDataSource: DataSource = {
    getRepository: vi.fn(() => mockRepository),
  } as any;

  describe('submitRequest', () => {
    /**
     * @target PublicStatusHandler.submitRequest should call axios.post with a mock object when submitRequest is called
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock UpdateStatusDTO object
     * - stub encryptor.getPk to resolve to a mock public key
     * - stub encryptor.sign to resolve to a mock signature
     * - stub PublicStatusHandler.axios.post to return
     * - call PublicStatusHandler.submitRequest with the provided DTO
     * @expected
     * - instance.dtoToSignMessageSpy should have been called once with the dto
     * - encryptor.sign should have been called once with signMessage
     * - axios.post should have been called once with path '/status' and a body containing:
     *   - the original DTO properties
     *   - pk equal to the mock public key
     *   - signature equal to the mock signature
     */
    it('should call axios.post with the correct payload when submitRequest is called', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);

      const dto: UpdateStatusDTO = {
        date: 10,
        eventId: id0,
        status: EventStatus.inPayment,
        tx: undefined,
      };

      const mockPk = 'mock-pk';
      const mockSignature = 'mock-signature';

      vi.spyOn(Configs.tssKeys.encryptor, 'getPk').mockResolvedValue(mockPk);
      const signSpy = vi
        .spyOn(Configs.tssKeys.encryptor, 'sign')
        .mockResolvedValue(mockSignature);
      const axiosPostSpy = vi
        .spyOn(instance['axios'], 'post')
        .mockResolvedValue({ data: {} });
      const signMessage = 'test-sign-message';
      const dtoToSignMessageSpy = vi
        .spyOn(instance as any, 'dtoToSignMessage')
        .mockReturnValue(signMessage);

      // act
      await instance.callSubmitRequest(dto);

      // assert
      expect(dtoToSignMessageSpy).toHaveBeenCalledOnce();
      expect(dtoToSignMessageSpy).toHaveBeenCalledWith(dto);
      expect(signSpy).toHaveBeenCalledOnce();
      expect(signSpy).toHaveBeenCalledWith(signMessage);
      expect(axiosPostSpy).toHaveBeenCalledOnce();
      expect(axiosPostSpy).toHaveBeenCalledWith('/status', {
        body: expect.objectContaining({
          eventId: id0,
          status: EventStatus.inPayment,
          tx: undefined,
          pk: mockPk,
          signature: mockSignature,
        }),
      });
    });
  });

  describe('updatePublicEventStatus', () => {
    const chain = 'chain1';
    const eventId = id0;
    const txId = id0;

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inPayment"
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object
     * - stub txRepository.findOne to resolve to the mock transaction
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status set to "inPayment"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with event and tx info when status is "inPayment"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);

      const eventStatus = EventStatus.inPayment;

      const mockTx: TransactionEntity = {
        txId,
        chain,
        type: TransactionType.payment,
        status: TransactionStatus.sent,
      } as any;
      mockRepository.findOne.mockResolvedValue(mockTx);

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, eventStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith({
        date: expect.any(Number),
        eventId,
        status: eventStatus,
        tx: {
          txId: mockTx.txId,
          chain,
          txType: mockTx.type,
          txStatus: mockTx.status,
        },
      });
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with event and tx info when status is "inReward"
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock transaction object
     * - stub txRepository.findOne to resolve to the mock transaction
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status set to "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with event and tx info when status is "inReward"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);

      const eventStatus = EventStatus.inReward;

      const mockTx: TransactionEntity = {
        txId,
        chain,
        type: TransactionType.reward,
        status: TransactionStatus.inSign,
        event: {
          id: eventId,
        } as any as ConfirmedEventEntity,
      } as any;
      mockRepository.findOne.mockResolvedValue(mockTx);

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, eventStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith({
        date: expect.any(Number),
        eventId,
        status: eventStatus,
        tx: {
          txId: mockTx.txId,
          chain,
          txType: mockTx.type,
          txStatus: mockTx.status,
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

      const instance = new TestPublicStatusHandler(mockDataSource);

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(eventId, status);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith({
        date: expect.any(Number),
        eventId,
        status,
        tx: undefined,
      });
    });
  });

  describe('updatePublicTxStatus', () => {
    const chain = 'chain1';
    const eventId = id0;
    const txId = id0;

    /**
     * @target PublicStatusHandler.updatePublicTxStatus should call submitRequest with a dto object containing transaction details
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler with a mock dataSource
     * - define a mock TransactionEntity object
     * - stub TxRepository.findOne to resolve to the mock transaction
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updatePublicTxStatus with the dto
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with a dto object containing transaction details', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);

      const eventStatus = EventStatus.inReward;
      const txStatus = TransactionStatus.sent;

      const mockTx: TransactionEntity = {
        txId,
        chain,
        type: TransactionType.reward,
        status: TransactionStatus.signed,
        event: {
          id: eventId,
          status: eventStatus,
        } as any as ConfirmedEventEntity,
      } as any;
      mockRepository.findOne.mockResolvedValue(mockTx);

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicTxStatus(txId, txStatus);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith({
        date: expect.any(Number),
        eventId,
        status: eventStatus,
        tx: {
          txId: txId,
          chain,
          txType: mockTx.type,
          txStatus: txStatus,
        },
      });
    });
  });
});
