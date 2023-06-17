import EventVerifier from '../../../src/verification/EventVerifier';

/**
 * mocks EventVerifier.isEventConfirmedEnough to return `result`
 * @param result
 */
const mockIsEventConfirmedEnough = (result: boolean) => {
  const functionSpy = vi.spyOn(EventVerifier, 'isEventConfirmedEnough');
  functionSpy.mockResolvedValue(result);
};

/**
 * mocks EventVerifier.verifyEvent to return `result`
 * @param result
 */
const mockVerifyEvent = (result: boolean) => {
  const functionSpy = vi.spyOn(EventVerifier, 'verifyEvent');
  functionSpy.mockResolvedValue(result);
};

/**
 * mocks EventVerifier.isEventPendingToType to return `result`
 * @param result
 */
const mockIsEventPendingToType = (result: boolean) => {
  const functionSpy = vi.spyOn(EventVerifier, 'isEventPendingToType');
  functionSpy.mockReturnValue(result);
};

export {
  mockIsEventConfirmedEnough,
  mockVerifyEvent,
  mockIsEventPendingToType,
};
