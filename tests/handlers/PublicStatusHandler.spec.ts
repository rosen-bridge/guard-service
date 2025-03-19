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

const id = '0000000000000000000000000000000000000000000000000000000000000000';

describe('PublicStatusHandler', () => {
  const mockRepository = {
    findOne: vi.fn(),
  };
  const mockDataSource: DataSource = {
    getRepository: vi.fn(() => mockRepository),
  } as any;

  beforeEach(() => {
    // clear all mocks between tests
    vi.clearAllMocks();
  });

  describe('submitRequest', () => {
    /**
     * @target PublicStatusHandler.submitRequest should call axios.post with a mock object when submitRequest is called
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler
     * - initialize PublicStatusHandler with the mock dataSource
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
      await TestPublicStatusHandler.init(mockDataSource);

      const dto: UpdateStatusDTO = {
        date: 10,
        eventId: id,
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
          eventId: id,
          status: EventStatus.inPayment,
          tx: undefined,
          pk: mockPk,
          signature: mockSignature,
        }),
      });
    });
  });

  describe('updatePublicEventStatus', () => {
    const eventId = id;

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with the dto including transaction details when status is "inPayment"
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler
     * - initialize PublicStatusHandler with the mock dataSource
     * - define a mock transaction object
     * - define a mock UpdateTxStatusDTO object
     * - stub txRepository.findOne to resolve to the mock transaction
     * - define a mock UpdateStatusDTO object with status set to "inPayment"
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with the mock dto
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with the dto including transaction details when status is "inPayment"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);
      await TestPublicStatusHandler.init(mockDataSource);

      const mockTx: TransactionEntity = {
        txId: 'tx-123',
        chain: 'c1',
        type: TransactionType.payment,
        status: TransactionStatus.completed,
      } as any;
      const mockTxDTO: UpdateTxStatusDTO = {
        txId: 'tx-123',
        chain: 'c1',
        txType: TransactionType.payment,
        txStatus: TransactionStatus.completed,
      };
      mockRepository.findOne.mockResolvedValue(mockTx);

      const dto: UpdateStatusDTO = {
        date: 0,
        eventId,
        status: EventStatus.inPayment,
        tx: mockTxDTO,
      };

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(dto);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith(dto);
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with the dto including transaction details when status is "inReward"
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler
     * - initialize PublicStatusHandler with the mock dataSource
     * - define a mock transaction object
     * - define a mock UpdateTxStatusDTO object
     * - stub txRepository.findOne to resolve to the mock transaction
     * - define a mock UpdateStatusDTO object
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status set to "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with the dto including transaction details when status is "inReward"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);
      await TestPublicStatusHandler.init(mockDataSource);

      const mockTx: TransactionEntity = {
        txId: 'tx-456',
        chain: 'c1',
        type: TransactionType.reward,
        status: TransactionStatus.inSign,
      } as any;
      const mockTxDTO: UpdateTxStatusDTO = {
        txId: 'tx-456',
        chain: 'c1',
        txType: TransactionType.reward,
        txStatus: TransactionStatus.inSign,
      };
      mockRepository.findOne.mockResolvedValue(mockTx);

      const dto: UpdateStatusDTO = {
        date: 0,
        eventId,
        status: EventStatus.inReward,
        tx: mockTxDTO,
      };

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(dto);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith(dto);
    });

    /**
     * @target PublicStatusHandler.updatePublicEventStatus should call submitRequest with the dto without transaction details when status is neither "inPayment" nor "inReward"
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler
     * - initialize PublicStatusHandler with the mock dataSource
     * - define a mock UpdateStatusDTO object
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updateEventStatus with status that is not "inPayment" or "inReward"
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with the dto without transaction details when status is neither "inPayment" nor "inReward"', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);
      await TestPublicStatusHandler.init(mockDataSource);

      const dto: UpdateStatusDTO = {
        date: 0,
        eventId,
        status: EventStatus.pendingPayment,
        tx: undefined,
      };

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicEventStatus(dto);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith(dto);
    });
  });

  describe('updatePublicTxStatus', () => {
    const eventId = id;
    const txId = id;

    /**
     * @target PublicStatusHandler.updatePublicTxStatus should call submitRequest with a dto object containing transaction details
     * @dependencies
     * @scenario
     * - define a mock PublicStatusHandler
     * - initialize PublicStatusHandler with the mock dataSource
     * - define a mock TransactionEntity object
     * - define a mock UpdateTxStatusDTO object
     * - stub TxRepository.findOne to resolve to the mock transaction
     * - define a mock UpdateStatusDTO object
     * - stub PublicStatusHandler.submitRequest to resolve
     * - call PublicStatusHandler.updatePublicTxStatus with the dto
     * @expected
     * - PublicStatusHandler.submitRequest should have been called once with the dto
     */
    it('should call submitRequest with a dto object containing transaction details', async () => {
      // arrange
      const instance = new TestPublicStatusHandler(mockDataSource);
      await TestPublicStatusHandler.init(mockDataSource);

      const mockTx: TransactionEntity = {
        txId,
        chain: 'c1',
        type: TransactionType.reward,
        event: {
          id: eventId,
          status: EventStatus.timeout,
        } as any as ConfirmedEventEntity,
      } as any;

      const mockTxDTO: UpdateTxStatusDTO = {
        txId,
        chain: 'c1',
        txType: TransactionType.reward,
        txStatus: TransactionStatus.sent,
      };

      mockRepository.findOne.mockResolvedValue(mockTx);

      const dto: UpdateStatusDTO = {
        date: 0,
        eventId,
        status: EventStatus.timeout,
        tx: mockTxDTO,
      };

      const submitRequestSpy = vi
        .spyOn(instance as any, 'submitRequest')
        .mockResolvedValue(undefined);

      // act
      await instance.updatePublicTxStatus(dto);

      // assert
      expect(submitRequestSpy).toHaveBeenCalledOnce();
      expect(submitRequestSpy).toHaveBeenCalledWith(dto);
    });
  });
});
