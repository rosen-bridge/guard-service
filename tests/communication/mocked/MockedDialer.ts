import { anything, deepEqual, instance, mock, reset, spy, verify, when } from "ts-mockito";
import Dialer from "../../../src/communication/Dialer";
import fs from "fs";
import TestConfigs from "../../testUtils/TestConfigs";

const mockedDialerInstance = mock(Dialer)
when(mockedDialerInstance.sendMessage(anything(), anything(), anything())).thenResolve()

const mockedDialer = spy(Dialer)
when(mockedDialer.getInstance()).thenResolve(instance(mockedDialerInstance))

let mockedFS = spy(fs)

/**
 * mocks existsSync function to check exist peerIdFile or no
 */
const mockExistsSync = (exist: boolean): void => {
    when(mockedFS.existsSync(TestConfigs.p2p.peerIdFilePath)).thenReturn(exist)
}

/**
 * mocks readFileSync function to read peerIdFile data
 */
const mockReadFileSync = (peerIdJson: any): void => {
    when(mockedFS.readFileSync(TestConfigs.p2p.peerIdFilePath, 'utf8')).thenReturn(JSON.stringify(peerIdJson))
}

/**
 * resets mocked FS in getOrCreatePeerID of Dialer
 */
const resetMockedFS = (): void => {
    reset(mockedFS)
    mockedFS = spy(fs)
}

/**
 * verifies Dialer sendMessage method called once for tx
 * @param channel
 * @param message
 */
const verifySendMessageCalledOnce = (channel: string, message: any): void => {
    verify(mockedDialerInstance.sendMessage(channel, deepEqual(message))).once()
}

/**
 * verifies Dialer sendMessage method called twice for tx
 * @param channel
 * @param message
 */
const verifySendMessageCalledTwice = (channel: string, message: any): void => {
    verify(mockedDialerInstance.sendMessage(channel, deepEqual(message))).twice()
}

/**
 * verifies Dialer sendMessage method called once for tx
 * @param channel
 * @param message
 * @param receiver
 */
const verifySendMessageWithReceiverCalledOnce = (channel: string, message: any, receiver: string): void => {
    verify(mockedDialerInstance.sendMessage(channel, deepEqual(message), receiver)).once()
}

/**
 * verifies Dialer sendMessage method didn't get called once for tx
 * @param channel
 * @param message
 * @param receiver
 */
const verifySendMessageDidntGetCalled = (channel: string, message: any, receiver?: string): void => {
    verify(mockedDialerInstance.sendMessage(channel, deepEqual(message))).never()
}

export {
    mockExistsSync,
    mockReadFileSync,
    resetMockedFS,
    verifySendMessageCalledOnce,
    verifySendMessageCalledTwice,
    verifySendMessageWithReceiverCalledOnce,
    verifySendMessageDidntGetCalled
}
