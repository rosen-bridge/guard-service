import TestUtils from '../testUtils/TestUtils';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { ErgoTransaction } from '@rosen-chains/ergo';

export const mockPaymentTransaction = (
  type: string = TransactionType.payment,
  chain: string = CARDANO_CHAIN,
  eventId: string = TestUtils.generateRandomId()
): PaymentTransaction => ({
  network: chain,
  txId: TestUtils.generateRandomId(),
  eventId: eventId,
  txBytes: Buffer.from('txBytes'),
  txType: type as TransactionType,
});

export const mockErgoPaymentTransaction = (
  type: string = TransactionType.payment,
  eventId: string = TestUtils.generateRandomId()
): ErgoTransaction =>
  new ErgoTransaction(
    TestUtils.generateRandomId(),
    eventId,
    Buffer.from('txBytes'),
    [],
    [],
    type as TransactionType
  );
