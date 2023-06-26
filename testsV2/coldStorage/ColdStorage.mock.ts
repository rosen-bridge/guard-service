import { SpyInstance } from 'vitest';
import ColdStorage from '../../src/coldStorage/ColdStorage';

class ColdStorageMock {
  private static mockMap = new Map<string, SpyInstance>();

  /**
   * restores all mocked functions of ColdStorage
   */
  static restoreMocks = () => {
    this.mockMap.forEach((spy) => spy.mockRestore());
    this.mockMap.clear();
  };

  /**
   * mocks a function for ColdStorage
   * @param name function name
   */
  static mockFunction = (name: string) => {
    const mockedFunction = vi.fn();
    const functionSpy = vi.spyOn(ColdStorage, name as any);
    this.mockMap.set(name, functionSpy);
    functionSpy.mockImplementation(mockedFunction);
    return mockedFunction;
  };

  /**
   * returns vitest spy object of the corresponding function
   * @param name function name
   * @returns the spy object
   */
  static getMockedSpy = (name: string): SpyInstance => {
    const spy = this.mockMap.get(name);
    if (!spy) throw Error(`Spy object [${name}] is not found`);
    return spy;
  };
}

export default ColdStorageMock;
