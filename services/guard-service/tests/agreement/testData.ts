import {
  PaymentTransaction,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import { CARDANO_CHAIN, CardanoTransaction } from '@rosen-chains/cardano';
import { ERGO_CHAIN, ErgoTransaction } from '@rosen-chains/ergo';

import TestUtils from '../testUtils/testUtils';

/**
 * generates a mocked PaymentTransaction object
 * @param type
 * @param chain
 * @param eventId
 * @returns
 */
export const mockPaymentTransaction = (
  type: string = TransactionType.payment,
  chain: string = CARDANO_CHAIN,
  eventId: string = TestUtils.generateRandomId(),
): PaymentTransaction => {
  if (chain === ERGO_CHAIN) return mockErgoPaymentTransaction(type, eventId);
  else if (chain === CARDANO_CHAIN)
    return mockCardanoTransaction(type, eventId);
  else {
    const txId = TestUtils.generateRandomId();
    return new PaymentTransaction(
      chain,
      txId,
      eventId,
      Buffer.from('txBytes'),
      type as TransactionType,
    );
  }
};

/**
 * generates a mocked CardanoTransaction object
 * @param type
 * @param eventId
 * @returns
 */
export const mockCardanoTransaction = (
  type: string = TransactionType.payment,
  eventId: string = TestUtils.generateRandomId(),
): CardanoTransaction =>
  new CardanoTransaction(
    TestUtils.generateRandomId(),
    eventId,
    Buffer.from('txBytes'),
    type as TransactionType,
    [],
  );

/**
 * generates a mocked ErgoTransaction object
 * @param type
 * @param eventId
 * @returns
 */
export const mockErgoPaymentTransaction = (
  type: string = TransactionType.payment,
  eventId: string = TestUtils.generateRandomId(),
): ErgoTransaction =>
  new ErgoTransaction(
    TestUtils.generateRandomId(),
    eventId,
    Buffer.from('txBytes'),
    type as TransactionType,
    [],
    [],
  );
