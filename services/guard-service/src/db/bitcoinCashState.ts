import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  BITCOIN_CASH_CHAIN,
  BitcoinCashTransaction,
} from '@rosen-chains/bitcoin-cash';

import EventSerializer from '../event/eventSerializer';
import { TransactionStatus } from '../utils/constants';
import { ConfirmedEventEntity } from './entities/confirmedEventEntity';
import { RejectedEventEntity } from './entities/rejectedEventEntity';
import { TransactionEntity } from './entities/transactionEntity';

/** Reject incompatible prototype state before starting network or signing jobs. */
export const assertBitcoinCashDatabaseCompatible = async (
  dataSource: DataSource,
  enabled: boolean,
): Promise<void> => {
  if (!enabled) return;
  /** Reject incompatible persisted identities without exposing row contents. */
  const failure = () => {
    throw Error(
      'Incompatible BCH database state; authenticated remediation required',
    );
  };
  for (const entity of [ConfirmedEventEntity, RejectedEventEntity]) {
    const repository = dataSource.getRepository(entity);
    for (let offset = 0; ; offset += 100) {
      const rows = await repository
        .createQueryBuilder('event')
        .innerJoinAndSelect('event.eventData', 'data')
        .where('data.fromChain = :chain', { chain: BITCOIN_CASH_CHAIN })
        .orderBy('event.id', 'ASC')
        .addOrderBy('data.id', 'ASC')
        .skip(offset)
        .take(100)
        .getMany();
      for (const row of rows) {
        if (
          row.id !== EventSerializer.getId(row.eventData) ||
          row.eventData.eventId !== EventSerializer.getRequestId(row.eventData)
        )
          failure();
      }
      if (rows.length < 100) break;
    }
  }
  const repository = dataSource.getRepository(TransactionEntity);
  for (let offset = 0; ; offset += 100) {
    const rows = await repository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.event', 'event')
      .leftJoinAndSelect('event.eventData', 'data')
      .where('transaction.chain = :chain OR data.fromChain = :chain', {
        chain: BITCOIN_CASH_CHAIN,
      })
      .orderBy('transaction.txId', 'ASC')
      .skip(offset)
      .take(100)
      .getMany();
    for (const row of rows) {
      try {
        if (row.event?.eventData.fromChain === BITCOIN_CASH_CHAIN) {
          const eventId = EventSerializer.getId(row.event.eventData);
          if (
            row.event.id !== eventId ||
            row.event.eventData.eventId !==
              EventSerializer.getRequestId(row.event.eventData) ||
            JSON.parse(row.txJson).eventId !== eventId
          )
            failure();
        }
        if (row.chain === BITCOIN_CASH_CHAIN) {
          const transaction = BitcoinCashTransaction.fromJson(row.txJson);
          if (
            transaction.txId !== row.txId ||
            transaction.txType !== row.type ||
            (row.event && transaction.eventId !== row.event.id) ||
            ([
              TransactionStatus.signed,
              TransactionStatus.sent,
              TransactionStatus.completed,
            ].includes(row.status) &&
              !transaction.isSigned())
          )
            failure();
        }
      } catch {
        failure();
      }
    }
    if (rows.length < 100) break;
  }
};
