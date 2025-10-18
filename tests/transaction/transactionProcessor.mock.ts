import { MockInstance } from 'vitest';

import TransactionProcessor from '../../src/transaction/transactionProcessor';

class TransactionProcessorMock {
  private static mockMap = new Map<string, MockInstance>();

  /**
   * restores all mocked functions of TransactionProcessor
   */
  static restoreMocks = () => {
    this.mockMap.forEach((spy) => spy.mockRestore());
    this.mockMap.clear();
  };

  /**
   * mocks a function for TransactionProcessor
   * @param name function name
   */
  static mockFunction = (name: string) => {
    const mockedFunction = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionSpy = vi.spyOn(TransactionProcessor, name as any);
    this.mockMap.set(name, functionSpy);
    functionSpy.mockImplementation(mockedFunction);
    return mockedFunction;
  };

  /**
   * returns vitest spy object of the corresponding function
   * @param name function name
   * @returns the spy object
   */
  static getMockedSpy = (name: string): MockInstance => {
    const spy = this.mockMap.get(name);
    if (!spy) throw Error(`Spy object [${name}] is not found`);
    return spy;
  };
}

export default TransactionProcessorMock;
