import { spy, when } from "ts-mockito";
import Utils from "../../src/helpers/Utils";

let mockedUtils = spy(Utils)

/**
 * mocks Utils guardTurn method to return result when called
 * @param result
 */
const mockGuardTurn = (result: number): void => {
    when(mockedUtils.guardTurn()).thenReturn(result)
}

export {
    mockGuardTurn
}
