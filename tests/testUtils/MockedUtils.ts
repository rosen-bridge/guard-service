import { reset, spy, when } from "ts-mockito";
import Utils from "../../src/helpers/Utils";

const mockedUtils = spy(Utils)

/**
 * mocks Utils guardTurn method to return result when called
 * @param result
 */
const mockGuardTurn = (result: number): void => {
    when(mockedUtils.guardTurn()).thenReturn(result)
}

/**
 * reset mocks methods of Utils
 */
const resetGuardTurn = (): void => {
    reset(mockedUtils)
}

export {
    mockGuardTurn,
    resetGuardTurn
}
