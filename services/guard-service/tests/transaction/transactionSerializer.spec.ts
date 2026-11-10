import { TransactionType as bchGuardNamespace_TransactionType } from '@rosen-chains/abstract-chain';
import { ErgoTransaction as bchGuardNamespace_ErgoTransaction } from '@rosen-chains/ergo';

import bchGuardNamespace_EventSerializer from '../../src/event/eventSerializer';
import { getTxDataHash as bchGuardNamespace_getTxDataHash } from '../../src/transaction/transactionSerializer';
import { namespaceEvent as bchGuardNamespace_namespaceEvent } from '../db/bitcoinCashNamespaceTestUtils';
import bchGuardNamespace_DatabaseActionMock from '../db/mocked/databaseAction.mock';

describe('getTxDataHash', () => {
  describe('BCH RCS bitcoinCashGuardNamespace', () => {
    beforeEach(async () => bchGuardNamespace_DatabaseActionMock.clearTables());

    /**
     * @target getTxDataHash - binds the BCH guard ID in Ergo %s JSON without
     * rewriting frozen transaction/input bytes
     * @dependencies EventSerializer, namespace fixture generator, SQLite
     * DatabaseActionMock, ErgoTransaction and mocked fee/event verification
     * seams.
     * @scenario binds the BCH guard ID in Ergo %s JSON without rewriting
     * frozen transaction/input bytes.
     * @expected Bind the BCH guard identity into the transaction digest
     * while preserving the serialized Ergo transaction and input bytes.
     */
    it.each([
      bchGuardNamespace_TransactionType.payment,
      bchGuardNamespace_TransactionType.reward,
    ])(
      'binds the BCH guard ID in Ergo %s JSON without rewriting frozen transaction/input bytes',
      (type) => {
        const event = bchGuardNamespace_namespaceEvent();
        const bytes = Buffer.from('frozen-transaction-bytes');
        const legacy = new bchGuardNamespace_ErgoTransaction(
          'tx-id',
          bchGuardNamespace_EventSerializer.getRequestId(event),
          bytes,
          type,
          [Buffer.from('input')],
          [Buffer.from('data-input')],
        );
        const bch = new bchGuardNamespace_ErgoTransaction(
          'tx-id',
          bchGuardNamespace_EventSerializer.getId(event),
          bytes,
          type,
          [Buffer.from('input')],
          [Buffer.from('data-input')],
        );
        const roundTrip = bchGuardNamespace_ErgoTransaction.fromJson(
          bch.toJson(),
        );
        expect(roundTrip.eventId).toEqual(
          bchGuardNamespace_EventSerializer.getId(event),
        );
        expect(roundTrip.txBytes).toEqual(bytes);
        expect(roundTrip.inputBoxes).toEqual(legacy.inputBoxes);
        expect(roundTrip.dataInputs).toEqual(legacy.dataInputs);
        expect(bchGuardNamespace_getTxDataHash(bch)).not.toEqual(
          bchGuardNamespace_getTxDataHash(legacy),
        );
      },
    );
  });
});
