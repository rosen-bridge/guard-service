import { anything, reset, spy, when } from 'ts-mockito';
import { EventTrigger, PaymentTransaction } from '../../../src/models/Models';
import EventVerifier from '../../../src/guard/event/EventVerifier';

let mockedEventVerifier = spy(EventVerifier);

/**
 * mocks EventVerifier isEventConfirmed method to return result when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 * @param result
 */
const mockIsEventConfirmedEnough = (
  event: EventTrigger,
  result: boolean
): void => {
  when(
    mockedEventVerifier.isEventConfirmedEnough(anything(), anything())
  ).thenResolve(result);
};

/**
 * mocks EventVerifier verifyEvent method to return result when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 * @param result
 */
const mockVerifyEvent = (event: EventTrigger, result: boolean): void => {
  when(mockedEventVerifier.verifyEvent(anything())).thenResolve(result);
};

/**
 * mocks EventVerifier verifyPaymentTransactionWithEvent method to return result when called for tx and event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param tx
 * @param event
 * @param result
 */
const mockVerifyPaymentTransactionWithEvent = (
  tx: PaymentTransaction,
  event: EventTrigger,
  result: boolean
): void => {
  when(
    mockedEventVerifier.verifyPaymentTransactionWithEvent(tx, anything())
  ).thenResolve(result);
};

/**
 * mocks EventVerifier verifyColdStorageTx method to return result when called for tx and event
 * @param tx
 * @param result
 */
const mockVerifyColdStorageTx = (
  tx: PaymentTransaction,
  result: boolean
): void => {
  when(mockedEventVerifier.verifyColdStorageTx(tx)).thenResolve(result);
};

/**
 * resets mocked methods of EventVerifier
 */
const resetMockedEventVerifier = (): void => {
  reset(mockedEventVerifier);
  mockedEventVerifier = spy(EventVerifier);
};

export {
  mockIsEventConfirmedEnough,
  mockVerifyPaymentTransactionWithEvent,
  mockVerifyEvent,
  mockVerifyColdStorageTx,
  resetMockedEventVerifier,
};
