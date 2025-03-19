import { DataSource, Not, Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import Configs from '../configs/Configs';
import { EventStatus, TransactionStatus } from '../utils/constants';
import { TransactionEntity } from '../db/entities/TransactionEntity';
import {
  ImpossibleBehavior,
  TransactionType,
} from '@rosen-chains/abstract-chain';

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
  private static instance?: PublicStatusHandler;
  readonly axios: AxiosInstance;
  readonly txRepository: Repository<TransactionEntity>;

  protected constructor(dataSource: DataSource) {
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
    const signMessage = this.dtoToSignMessage(dto);

    await this.axios.post('/status', {
      body: {
        ...dto,
        pk: await Configs.tssKeys.encryptor.getPk(),
        signature: await Configs.tssKeys.encryptor.sign(signMessage),
      },
    });
  };

  /**
   * sends a request to update public status of an event
   * @param eventId
   * @param status
   * @returns a promise that resolves to void
   */
  updatePublicEventStatus = async (dto: UpdateStatusDTO): Promise<void> => {
    try {
      if (
        dto.status === EventStatus.inPayment ||
        dto.status === EventStatus.inReward
      ) {
        const tx = await this.txRepository.findOne({
          where: {
            event: { id: dto.eventId },
            status: Not(TransactionStatus.invalid),
          },
        });

        if (!tx) {
          throw new ImpossibleBehavior(
            `No valid tx is found for event [${dto.eventId}]`
          );
        }

        dto.tx = {
          txId: tx.txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus: tx.status,
        };
      }

      await this.submitRequest(dto);
    } catch (e) {
      logger.error(
        `An error occurred while submitting status change signal on Event: ${e}`
      );
      if (e.stack) logger.error(e.stack);
    }
  };

  /**
   * sends a request to update public status of a transaction
   * @param txId
   * @param txStatus
   * @returns a promise that resolves to void
   */
  updatePublicTxStatus = async (dto: UpdateStatusDTO): Promise<void> => {
    try {
      const tx = await this.txRepository.findOne({
        relations: ['event'],
        where: {
          txId: dto.tx!.txId,
        },
      });

      if (!tx) {
        throw new ImpossibleBehavior(`Tx [${dto.tx!.txId}] is not found!`);
      }

      if (
        tx.type !== TransactionType.payment &&
        tx.type !== TransactionType.reward
      ) {
        return;
      }

      dto.eventId = tx.event.id;
      dto.status = tx.event.status;
      dto.tx = {
        txId: tx.txId,
        chain: tx.chain,
        txType: tx.type,
        txStatus: dto.tx!.txStatus,
      };

      await this.submitRequest(dto);
    } catch (e) {
      logger.error(
        `An error occurred while submitting status change signal on Transaction: ${e}`
      );
      if (e.stack) logger.error(e.stack);
    }
  };
}

export default PublicStatusHandler;
