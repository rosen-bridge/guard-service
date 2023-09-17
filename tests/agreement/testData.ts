import TestUtils from '../testUtils/TestUtils';
import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN, CardanoTransaction } from '@rosen-chains/cardano';
import { ERGO_CHAIN, ErgoTransaction } from '@rosen-chains/ergo';

export const mockPaymentTransaction = (
  type: string = TransactionType.payment,
  chain: string = CARDANO_CHAIN,
  eventId: string = TestUtils.generateRandomId()
): PaymentTransaction => {
  if (chain === ERGO_CHAIN) return mockErgoPaymentTransaction(type, eventId);
  else if (chain === CARDANO_CHAIN)
    return mockCardanoTransaction(type, eventId);
  else
    return {
      network: chain,
      txId: TestUtils.generateRandomId(),
      eventId: eventId,
      txBytes: Buffer.from('txBytes'),
      txType: type as TransactionType,
    };
};

export const mockCardanoTransaction = (
  type: string = TransactionType.payment,
  eventId: string = TestUtils.generateRandomId()
): CardanoTransaction =>
  new CardanoTransaction(
    eventId,
    Buffer.from('txBytes'),
    TestUtils.generateRandomId(),
    type as TransactionType,
    []
  );

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
