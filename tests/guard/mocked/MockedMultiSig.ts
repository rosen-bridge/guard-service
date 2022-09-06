import { anything, instance, mock, resetCalls, spy, when } from "ts-mockito";
import MultiSigHandler from "../../../src/guard/multisig/MultiSig";

const mockedMultiSigHandlerInstance = mock(MultiSigHandler)
when(mockedMultiSigHandlerInstance.sign(anything(), anything(), anything())).thenThrow(Error("multiSig sign mocked to throw this error"))
when(mockedMultiSigHandlerInstance.sign(anything(), anything(), anything(), anything())).thenThrow(Error("multiSig sign mocked to throw this error"))

const mockedMultiSigHandler = spy(MultiSigHandler)
when(mockedMultiSigHandler.getInstance(anything())).thenReturn(instance(mockedMultiSigHandlerInstance))
when(mockedMultiSigHandler.getInstance(anything(), anything())).thenReturn(instance(mockedMultiSigHandlerInstance))

/**
 * reset call counts for mockedMultiSigHandlerInstance
 */
const resetMultiSigInstanceCalls = (): void => {
    resetCalls(mockedMultiSigHandlerInstance)
}

export {
    resetMultiSigInstanceCalls
}
