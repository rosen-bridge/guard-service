import axios, { AxiosInstance } from 'axios';
import { DataSource, Not, Repository } from 'typeorm';

import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import {
  ImpossibleBehavior,
  TransactionType,
} from '@rosen-chains/abstract-chain';

import Configs from '../configs/configs';
import { TransactionEntity } from '../db/entities/transactionEntity';
import { EventStatus, TransactionStatus } from '../utils/constants';

export const logger = CallbackLoggerFactory.getInstance().getLogger(
  import.meta.url,
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
  readonly axios?: AxiosInstance;
  readonly txRepository: Repository<TransactionEntity>;

  protected constructor(
    dataSource: DataSource,
    publicStatusBaseUrl: string | undefined = undefined,
  ) {
    if (publicStatusBaseUrl) {
      logger.debug('publicStatusBaseUrl exists, initialize axios instance');
      this.axios = axios.create({
        baseURL: publicStatusBaseUrl,
      });
    } else
      logger.debug(
        'publicStatusBaseUrl does not exist, skipping axios initialization',
      );
    this.txRepository = dataSource.getRepository(TransactionEntity);
  }

  /**
   * initialize PublicStatusHandler
   */
  static init = async (dataSource: DataSource) => {
    PublicStatusHandler.instance = new PublicStatusHandler(
      dataSource,
      Configs.publicStatusBaseUrl,
    );
  };

  /**
   * get PublicStatusHandler instance or throw
   * @returns PublicStatusHandler instance
   */
  static getInstance = () => {
    if (!PublicStatusHandler.instance)
      throw Error(
        `PublicStatusHandler should have been initialized before getInstance`,
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
    if (!this.axios) {
      logger.debug('axios is not initialized, skipping submitRequest');
      return;
    }

    const signMessage = this.dtoToSignMessage(dto);

    await this.axios!.post('/status', {
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
  updatePublicEventStatus = async (
    eventId: string,
    status: EventStatus,
  ): Promise<void> => {
    try {
      let txDto: UpdateTxStatusDTO | undefined;

      if (status === EventStatus.inPayment || status === EventStatus.inReward) {
        const tx = await this.txRepository.findOne({
          where: {
            event: { id: eventId },
            status: Not(TransactionStatus.invalid),
          },
        });

        if (!tx) {
          throw new ImpossibleBehavior(
            `No valid tx is found for event [${eventId}]`,
          );
        }

        txDto = {
          txId: tx.txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus: tx.status,
        };
      }

      const dto: UpdateStatusDTO = {
        date: Date.now(),
        eventId,
        status,
        tx: txDto,
      };

      await this.submitRequest(dto);
    } catch (e) {
      logger.error(
        `An error occurred while submitting status change signal on Event: ${e}`,
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
  updatePublicTxStatus = async (
    txId: string,
    txStatus: TransactionStatus,
  ): Promise<void> => {
    try {
      const tx = await this.txRepository.findOne({
        relations: ['event'],
        where: {
          txId,
        },
      });

      if (!tx) {
        throw new ImpossibleBehavior(`Tx [${txId}] is not found!`);
      }
      if (!tx.event) {
        throw new ImpossibleBehavior(`Event of tx [${txId}] is not found!`);
      }

      if (
        tx.type !== TransactionType.payment &&
        tx.type !== TransactionType.reward
      ) {
        return;
      }

      const dto: UpdateStatusDTO = {
        date: Date.now(),
        eventId: tx.event.id,
        status: tx.event.status,
        tx: {
          txId,
          chain: tx.chain,
          txType: tx.type,
          txStatus,
        },
      };

      await this.submitRequest(dto);
    } catch (e) {
      logger.error(
        `An error occurred while submitting status change signal on Transaction: ${e}`,
      );
      if (e.stack) logger.error(e.stack);
    }
  };
}

export default PublicStatusHandler;
