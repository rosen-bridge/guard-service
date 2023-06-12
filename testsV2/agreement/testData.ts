import TestUtils from '../../tests/testUtils/TestUtils';
import {
  PaymentTransaction,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';

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
