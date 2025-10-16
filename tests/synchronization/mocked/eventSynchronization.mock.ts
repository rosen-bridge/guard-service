import { Mock } from 'vitest';
import EventSynchronization from '../../../src/synchronization/eventSynchronization';

class EventSynchronizationMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mockedEventSynchronization: Record<string, any>;

  /**
   * resets all mocked functions of EventSynchronization
   */
  static resetMock = () => {
    this.mockedEventSynchronization = {};
  };

  /**
   * mocks EventSynchronization.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi.spyOn(EventSynchronization, 'getInstance');
    functionSpy.mockReturnValue(
      this.mockedEventSynchronization as EventSynchronization,
    );
  };

  /**
   * mocks EventSynchronization.addEventToQueue
   */
  static mockAddEventToQueue = () => {
    this.mockedEventSynchronization.addEventToQueue = vi.fn();
    const functionSpy = vi.spyOn(
      this.mockedEventSynchronization,
      'addEventToQueue',
    );
    functionSpy.mockImplementation(() => null);
  };

  /**
   * returns vitest mock object of the corresponding function
   * @param name function name
   * @returns the mock object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMockedFunction = (name: string): Mock<any> => {
    return this.mockedEventSynchronization[name];
  };
}

export default EventSynchronizationMock;
