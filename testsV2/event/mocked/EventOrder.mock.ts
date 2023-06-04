import { PaymentOrder, SinglePayment } from '@rosen-chains/abstract-chain';
import EventOrder from '../../../src/event/EventOrder';

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
const mockEventRewardOrder = (result: PaymentOrder) => {
  const functionSpy = vi.spyOn(EventOrder, 'eventRewardOrder');
  functionSpy.mockReturnValue(result);
};

export { mockEventSinglePayment, mockEventRewardOrder };
