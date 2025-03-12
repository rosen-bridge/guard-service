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

export type UpdateTxStatusDTO = {
  txId: string;
  chain: string;
  txType: string;
  txStatus: TransactionStatus;
};

export type UpdateStatusDTO = {
  date: number;
  eventId: string;
  status: EventStatus;
  tx?: UpdateTxStatusDTO;
};

class PublicStatusHandler {
  private static instance: PublicStatusHandler;
  readonly axios: AxiosInstance;
  readonly txRepository: Repository<TransactionEntity>;

  private constructor(dataSource: DataSource) {
    this.axios = axios.create({
      baseURL: Configs.publicStatusBaseUrl,
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
    return dto.tx
      ? `${dto.eventId}${dto.status}${dto.tx.txId}${dto.tx.chain}${dto.tx.txType}${dto.tx.txStatus}${dto.date}`
      : `${dto.eventId}${dto.status}${dto.date}`;
  };

  /**
   * submits a request with updated status information
   * @param dto - UpdateStatusDTO containing the update status details
   * @returns a promise that resolves to void
   */
  protected submitRequest = async (dto: UpdateStatusDTO): Promise<void> => {
    const now = Date.now();
    const signMessage = this.dtoToSignMessage({ ...dto, date: now });

    try {
      await this.axios.post('/status', {
        body: {
          ...dto,
          date: now,
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
   * @returns a promise that resolves to void
   */
  updatePublicEventStatus = async (
    eventId: string,
    status: EventStatus
  ): Promise<void> => {
    const dto: UpdateStatusDTO = {
      date: 0,
      eventId,
      status,
      tx: undefined,
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

      dto.tx = {
        txId: tx.txId,
        chain: tx.chain,
        txType: tx.type,
        txStatus: tx.status,
      };
    }

    return this.submitRequest(dto);
  };

  /**
   * sends a request to update public status of a transaction
   * @param txId
   * @param txStatus
   * @returns a promise that resolves to void
   */
  updatePublicTxStatus = async (
    txId: string,
    txStatus: TransactionStatus
  ): Promise<void> => {
    const dto: UpdateStatusDTO = {
      date: 0,
      eventId: '',
      status: EventStatus.pendingPayment,
      tx: undefined,
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
    dto.tx = {
      txId: tx.txId,
      chain: tx.chain,
      txType: tx.type,
      txStatus,
    };

    return this.submitRequest(dto);
  };
}

export default PublicStatusHandler;
