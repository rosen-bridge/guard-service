import EventReprocess from '../../../src/reprocess/EventReprocess';

class EventReprocessMock {
  private static mockedEventReprocess: Record<string, any>;

  /**
   * resets all mocked functions of eventReprocess
   */
  static resetMock = () => {
    this.mockedEventReprocess = {};
  };

  /**
   * mocks EventReprocess.getInstance to return mocked object
   */
  static mock = () => {
    const functionSpy = vi.spyOn(EventReprocess, 'getInstance');
    functionSpy.mockReturnValue(this.mockedEventReprocess as EventReprocess);
  };

  /**
   * mocks EventReprocess.sendReprocessRequest to throw Error or not
   * @param throwError
   */
  static mockSendReprocessRequest = (throwError: boolean, error?: Error) => {
    this.mockedEventReprocess.sendReprocessRequest = vi.fn();
    if (throwError)
      this.mockedEventReprocess.sendReprocessRequest.mockRejectedValue(
        error ?? Error(`TestError: Error occurred in sendReprocessRequest`)
      );
    else
      this.mockedEventReprocess.sendReprocessRequest.mockResolvedValue(
        undefined
      );
  };
}

export default EventReprocessMock;
