import GuardTurn from '../../../src/utils/guardTurn';

/**
 * mocks GuardTurn.guardTurn to return `result`
 * @param result
 */
const mockGuardTurn = (result: number) => {
  const functionSpy = vi.spyOn(GuardTurn, 'guardTurn');
  functionSpy.mockReturnValue(result);
};

export { mockGuardTurn };
