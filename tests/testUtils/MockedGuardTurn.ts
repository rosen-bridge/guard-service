import { reset, spy, when } from 'ts-mockito';
import GuardTurn from '../../src/helpers/GuardTurn';

const mockedGuardTurn = spy(GuardTurn);

/**
 * mocks Utils guardTurn method to return result when called
 * @param result
 */
const mockGuardTurn = (result: number): void => {
  when(mockedGuardTurn.guardTurn()).thenReturn(result);
};

/**
 * reset mocks methods of Utils
 */
const resetGuardTurn = (): void => {
  reset(mockedGuardTurn);
};

export { mockGuardTurn, resetGuardTurn };
