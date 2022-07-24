import { anything, deepEqual, reset, spy, verify, when } from "ts-mockito";
import EventProcessor from "../../../src/guard/EventProcessor";
import { EventTrigger, PaymentTransaction } from "../../../src/models/Models";

let mockedEventProcessor = spy(EventProcessor)

/**
 * mocks EventProcessor isEventConfirmed method to return result when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 * @param result
 */
const mockIsEventConfirmedEnough = (event: EventTrigger, result: boolean): void => {
    when(mockedEventProcessor.isEventConfirmedEnough(anything())).thenResolve(result)
}

/**
 * mocks EventProcessor verifyEvent method to return result when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 * @param result
 */
const mockVerifyEvent = (event: EventTrigger, result: boolean): void => {
    when(mockedEventProcessor.verifyEvent(anything())).thenResolve(result)
}

/**
 * mocks EventProcessor verifyPaymentTransactionWithEvent method to return result when called for tx and event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param tx
 * @param event
 * @param result
 */
const mockVerifyPaymentTransactionWithEvent = (tx: PaymentTransaction, event: EventTrigger, result: boolean): void => {
    when(mockedEventProcessor.verifyPaymentTransactionWithEvent(tx, anything())).thenReturn(result)
}

/**
 * mocks EventProcessor submitTransactionToChain method when called for tx and chain
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param tx
 * @param chain
 */
const mockSubmitTransactionToChain = (tx: PaymentTransaction, chain: string): void => {
    when(mockedEventProcessor.submitTransactionToChain(anything(), chain)).thenResolve()
}

/**
 * verifies EventProcessor createEventPayment method called once for event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 */
const verifyCreateEventPaymentCalledOnce = (event: EventTrigger): void => {
    verify(mockedEventProcessor.createEventPayment(anything())).once()
}

/**
 * verifies EventProcessor createEventPayment method didn't get called once for event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 */
const verifyCreateEventPaymentDidntGetCalled = (event: EventTrigger): void => {
    verify(mockedEventProcessor.createEventPayment(anything())).never()
}

/**
 * verifies EventProcessor submitTransactionToChain method called once for tx
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param tx
 * @param chain
 */
const verifySubmitTransactionToChainCalledOnce = (tx: PaymentTransaction, chain: string): void => {
    verify(mockedEventProcessor.submitTransactionToChain(anything(), chain)).once()
}

/**
 * resets mocked methods of EventProcessor
 */
const resetMockedEventProcessor = (): void => {
    reset(mockedEventProcessor)
    mockedEventProcessor = spy(EventProcessor)
}

export {
    mockIsEventConfirmedEnough,
    mockVerifyPaymentTransactionWithEvent,
    mockVerifyEvent,
    mockSubmitTransactionToChain,
    verifyCreateEventPaymentCalledOnce,
    verifyCreateEventPaymentDidntGetCalled,
    verifySubmitTransactionToChainCalledOnce,
    resetMockedEventProcessor
}
