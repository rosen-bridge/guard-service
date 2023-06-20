import TestUtils from '../../tests/testUtils/TestUtils';
import {
  PaymentTransaction,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ErgoTransaction } from '@rosen-chains/ergo';

export const mockPaymentTransaction = (
  type: string = TransactionTypes.payment,
  chain: string = CARDANO_CHAIN,
  eventId: string = TestUtils.generateRandomId()
): PaymentTransaction => ({
  network: chain,
  txId: TestUtils.generateRandomId(),
  eventId: eventId,
  txBytes: Buffer.from('txBytes'),
  txType: type,
});

export const mockErgoPaymentTransaction = (
  type: string = TransactionTypes.payment,
  eventId: string = TestUtils.generateRandomId()
): ErgoTransaction =>
  new ErgoTransaction(
    TestUtils.generateRandomId(),
    eventId,
    Buffer.from('txBytes'),
    [],
    [],
    type
  );
