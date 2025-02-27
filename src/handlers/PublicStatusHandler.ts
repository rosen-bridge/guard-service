import { DataSource, Not, Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { TransactionType } from '@rosen-chains/abstract-chain';
import Configs from '../configs/Configs';
import { EventStatus, TransactionStatus } from '../utils/constants';
import { TransactionEntity } from '../db/entities/TransactionEntity';

export const logger = DefaultLoggerFactory.getInstance().getLogger(
  import.meta.url
);

// TODO: where should this go? need to be shared with api
export type UpdateStatusDTO = {
  date: number;
  eventId: string;
  status: EventStatus;
  txId: string | undefined;
  txType: string | undefined;
  txStatus: TransactionStatus | undefined;
};

class PublicStatusHandler {
  private static instance: PublicStatusHandler;
  readonly axios: AxiosInstance;
  readonly txRepository: Repository<TransactionEntity>;

  private constructor(dataSource: DataSource) {
    this.axios = axios.create({
      baseURL: Configs.publicEventStatusBaseUrl,
    });
    this.txRepository = dataSource.getRepository(TransactionEntity);
  }

  /**
   * initialize PublicStatusHandler
   */
  static init = async (dataSource: DataSource) => {
    PublicStatusHandler.instance = new PublicStatusHandler(dataSource);
  };

  /**
   * get PublicStatusHandler instance or throw
   * @returns PublicStatusHandler instance
   */
  static getInstance = () => {
    if (!PublicStatusHandler.instance)
      throw Error(
        `PublicStatusHandler should have been initialized before getInstance`
      );
    return PublicStatusHandler.instance;
  };

  /**
   * generates sign message from UpdateStatusDTO
   * @param dto
   * @returns string
   */
  protected dtoToSignMessage = (dto: UpdateStatusDTO): string => {
    // TODO: move this fn with UpdateStatusDTO
    return `${dto.eventId}${dto.status}${dto.txId ?? ''}${dto.txType ?? ''}${
      dto.txStatus ?? ''
    }${dto.date}`;
  };

  /**
   * submits a request with updated status information
   * @param dto - UpdateStatusDTO containing the update status details
   * @returns promise of void
   */
  protected submitRequest = async (dto: UpdateStatusDTO): Promise<void> => {
    const signMessage = this.dtoToSignMessage(dto);

    try {
      await this.axios.post('/status', {
        body: {
          ...dto,
          pk: await Configs.tssKeys.encryptor.getPk(),
          signature: await Configs.tssKeys.encryptor.sign(signMessage),
        },
      });
    } catch (error) {
      logger.error(error);
    }
  };

  /**
   * sends a request to update public status of an event
   * @param eventId
   * @param status
   * @returns promise of void
   */
  updatePublicEventStatus = async (
    eventId: string,
    status: EventStatus
  ): Promise<void> => {
    let txId: string | undefined;
    let txType: string | undefined;
    let txStatus: string | undefined;

    const dto = {
      date: Date.now(),
      eventId,
      status,
      txId,
      txType,
      txStatus,
    };

    if (status === EventStatus.inPayment || status === EventStatus.inReward) {
      const tx = await this.txRepository.findOne({
        where: {
          event: { id: eventId },
          status: Not(TransactionStatus.invalid),
          type:
            status === EventStatus.inPayment
              ? TransactionType.payment
              : TransactionType.reward,
        },
        order: {
          lastStatusUpdate: 'DESC',
        },
      });

      if (!tx) {
        throw new Error(
          `a tx should have existed for eventId: ${eventId}, but none was found.`
        );
      }

      dto.txId = tx.txId;
      dto.txType = tx.type;
      dto.txStatus = tx.status;
    }

    return this.submitRequest(dto);
  };

  /**
   * sends a request to update public status of a transaction
   * @param txId
   * @param txStatus
   * @returns promise of void
   */
  updatePublicTxStatus = async (
    txId: string,
    txStatus: TransactionStatus
  ): Promise<void> => {
    let txType: string | undefined;

    const dto = {
      date: Date.now(),
      eventId: '',
      status: EventStatus.pendingPayment,
      txId,
      txType,
      txStatus,
    };

    const tx = await this.txRepository.findOne({
      relations: ['event'],
      where: {
        txId,
      },
    });

    if (!tx) {
      throw new Error(
        `a tx should have existed with id: ${txId}, but none was found.`
      );
    }

    dto.eventId = tx.event.id;
    dto.status = tx.event.status;
    dto.txType = tx.type;

    return this.submitRequest(dto);
  };
}

export default PublicStatusHandler;
