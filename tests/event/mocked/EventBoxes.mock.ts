import EventBoxes from '../../../src/event/EventBoxes';

/**
 * mocks EventBoxes.getEventBox to return `result`
 * @param result
 */
const mockGetEventBox = (result: string) => {
  const functionSpy = vi.spyOn(EventBoxes, 'getEventBox');
  functionSpy.mockResolvedValue(result);
};

/**
 * mocks EventBoxes.getEventValidCommitments to return `result`
 * @param result
 */
const mockGetEventValidCommitments = (result: string[]) => {
  const functionSpy = vi.spyOn(EventBoxes, 'getEventValidCommitments');
  functionSpy.mockResolvedValue(result);
};

/**
 * mocks EventBoxes.getEventWIDs to return `result`
 * @param result
 */
const mockGetEventWIDs = (result: string[]) => {
  const functionSpy = vi.spyOn(EventBoxes, 'getEventWIDs');
  functionSpy.mockResolvedValue(result);
};

export { mockGetEventBox, mockGetEventValidCommitments, mockGetEventWIDs };
