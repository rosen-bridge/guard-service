import { ConfirmationStatus } from '@rosen-chains/abstract-chain';

import { DatabaseAction } from '../../src/db/databaseAction';
import { TransactionEntity } from '../../src/db/entities/transactionEntity';
import * as TransactionSerializer from '../../src/transaction/transactionSerializer';
import { TransactionStatus } from '../../src/utils/constants';
import { chainHandlerInstance } from '../handlers/chainHandler.mock';
import { malformedLegacyRecord } from './transactionProcessorLegacyTestData';

/**
 * Keep the actual deserializer while controlling legacy provider and persistence ports.
 * @param status - Persisted processing status
 * @param confirmation - Provider confirmation outcome
 * @param mempool - Provider mempool outcome
 * @returns Malformed row and spies deciding deserialization timing
 */
export const malformedLegacyFixture = async (
  status: TransactionStatus,
  confirmation: ConfirmationStatus,
  mempool = false,
) => {
  const row = Object.assign(new TransactionEntity(), malformedLegacyRecord, {
    status,
  });
  const chain = {
    getTxConfirmationStatus: vi.fn().mockResolvedValue(confirmation),
    isTxInMempool: vi.fn().mockResolvedValue(mempool),
    getHeight: vi.fn().mockResolvedValue(321),
  };
  vi.spyOn(chainHandlerInstance, 'getChain').mockReturnValue(chain as never);
  const actual = await vi.importActual<typeof TransactionSerializer>(
    '../../src/transaction/transactionSerializer',
  );
  const deserialize = vi
    .spyOn(TransactionSerializer, 'fromJson')
    .mockImplementation(actual.fromJson);
  const action = DatabaseAction.getInstance();
  const setStatus = vi
    .spyOn(action, 'setTxStatus')
    .mockResolvedValue(undefined);
  const updateHeight = vi
    .spyOn(action, 'updateTxLastCheck')
    .mockResolvedValue(undefined);
  return { row, chain, deserialize, setStatus, updateHeight };
};
