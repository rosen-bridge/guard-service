import { anything, reset, spy, when } from "ts-mockito";
import EventProcessor from "../../../src/guard/EventProcessor";
import { EventTrigger, PaymentTransaction } from "../../../src/models/Models";

let mockedEventProcessor = spy(EventProcessor)

/**
 * mocks eventProcessor isEventConfirmed method to return result when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 * @param result
 */
const mockIsEventConfirmedEnough = (event: EventTrigger, result: boolean): void => {
    when(mockedEventProcessor.isEventConfirmedEnough(anything())).thenResolve(result)
}

/**
 * mocks eventProcessor verifyPaymentTransactionWithEvent method to return result when called for an event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param tx
 * @param event
 * @param result
 */
const mockVerifyPaymentTransactionWithEvent = (tx: PaymentTransaction, event: EventTrigger, result: boolean): void => {
    when(mockedEventProcessor.verifyPaymentTransactionWithEvent(tx, anything())).thenReturn(result)
}

/**
 * resets mocked methods of eventProcessor
 */
const resetMockedEventProcessor = (): void => {
    reset(mockedEventProcessor)
    mockedEventProcessor = spy(EventProcessor)
}

export {
    mockIsEventConfirmedEnough,
    mockVerifyPaymentTransactionWithEvent,
    resetMockedEventProcessor
}
