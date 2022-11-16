import { anything, reset, spy, verify } from 'ts-mockito';
import EventProcessor from '../../../src/guard/event/EventProcessor';
import { EventTrigger } from '../../../src/models/Models';

let mockedEventProcessor = spy(EventProcessor);

/**
 * verifies EventProcessor createEventPayment method called once for event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 */
const verifyCreateEventPaymentCalledOnce = (event: EventTrigger): void => {
  verify(mockedEventProcessor.createEventPayment(anything())).once();
};

/**
 * verifies EventProcessor createEventPayment method didn't get called once for event
 *  Note: currently, specifying argument does not work. ts-mockito deepEqual malfunctions with EventTrigger type.
 * @param event
 */
const verifyCreateEventPaymentDidntGetCalled = (event: EventTrigger): void => {
  verify(mockedEventProcessor.createEventPayment(anything())).never();
};

/**
 * resets mocked methods of EventProcessor
 */
const resetMockedEventProcessor = (): void => {
  reset(mockedEventProcessor);
  mockedEventProcessor = spy(EventProcessor);
};

export {
  verifyCreateEventPaymentCalledOnce,
  verifyCreateEventPaymentDidntGetCalled,
  resetMockedEventProcessor,
};
