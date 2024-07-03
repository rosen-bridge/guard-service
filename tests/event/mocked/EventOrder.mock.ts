import { PaymentOrder, SinglePayment } from '@rosen-chains/abstract-chain';
import EventOrder from '../../../src/event/EventOrder';

/**
 * mocks EventOrder.createEventPaymentOrder to return `result`
 * @param result
 */
const mockCreateEventPaymentOrder = (result: PaymentOrder) => {
  const functionSpy = vi.spyOn(EventOrder, 'createEventPaymentOrder');
  functionSpy.mockResolvedValue(result);
};

/**
 * mocks EventOrder.createEventRewardOrder to return `result`
 * @param result
 */
const mockCreateEventRewardOrder = (result: PaymentOrder) => {
  const functionSpy = vi.spyOn(EventOrder, 'createEventRewardOrder');
  functionSpy.mockResolvedValue(result);
};

/**
 * mocks EventOrder.eventSinglePayment to return `result`
 * @param result
 */
const mockEventSinglePayment = (result: SinglePayment) => {
  const functionSpy = vi.spyOn(EventOrder, 'eventSinglePayment');
  functionSpy.mockReturnValue(result);
};

/**
 * mocks EventOrder.eventRewardOrder to return `result`
 * @param result
 */
const mockEventRewardOrder = (watchers: PaymentOrder, guards: PaymentOrder) => {
  const functionSpy = vi.spyOn(EventOrder, 'eventRewardOrder');
  functionSpy.mockReturnValue({
    watchersOrder: watchers,
    guardsOrder: guards,
  });
};

export {
  mockCreateEventPaymentOrder,
  mockCreateEventRewardOrder,
  mockEventSinglePayment,
  mockEventRewardOrder,
};
