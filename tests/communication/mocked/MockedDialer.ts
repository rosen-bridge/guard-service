import {
  anyString,
  anything,
  capture,
  deepEqual,
  instance,
  mock,
  reset,
  resetCalls,
  spy,
  verify,
  when,
} from 'ts-mockito';
import Dialer from '../../../src/communication/simple-http/Dialer';
import fs from 'fs';
import TestConfigs from '../../testUtils/TestConfigs';

const mockedDialerInstance = mock(Dialer);
when(mockedDialerInstance.getPeerId()).thenReturn('peerId');
await when(mockedDialerInstance.sendMessage).thenReturn(() => {
  return Promise.resolve();
});

const mockedDialer = spy(Dialer);
when(mockedDialer.getInstance()).thenReturn(instance(mockedDialerInstance));

/**
 *
 * @param bodyKeys
 * @param payloadKeys
 * @param messageType
 */
const sendMessageBodyAndPayloadArguments = (
  bodyKeys: Array<string>,
  payloadKeys: Array<string>,
  messageType = 'approve'
): void => {
  const message = capture(mockedDialerInstance.sendMessage).first()[1];
  const json = JSON.parse(message);
  if (json.type === messageType) {
    payloadKeys.forEach((key) => {
      if (!(key in json.payload))
        throw `key "${key}" is not in the dialer payload message`;
    });
    bodyKeys.forEach((key) => {
      if (!(key in json)) throw 'key is not in the message';
    });
  }
};

let mockedFS = spy(fs);

/**
 * mocks existsSync function to check exist peerIdFile or no
 */
const mockExistsSync = (exist: boolean): void => {
  when(mockedFS.existsSync(TestConfigs.p2p.peerIdFilePath)).thenReturn(exist);
};

/**
 * mocks readFileSync function to read peerIdFile data
 */
const mockReadFileSync = (peerIdJson: any): void => {
  when(
    mockedFS.readFileSync(TestConfigs.p2p.peerIdFilePath, 'utf8')
  ).thenReturn(JSON.stringify(peerIdJson));
};

/**
 * resets mocked FS in getOrCreatePeerID of Dialer
 */
const resetMockedFS = (): void => {
  reset(mockedFS);
  mockedFS = spy(fs);
};

/**
 * verifies Dialer sendMessage method called once for tx
 * @param channel
 * @param message
 */
const verifySendMessageCalledOnce = (channel: string, message: any): void => {
  verify(mockedDialerInstance.sendMessage(channel, deepEqual(message))).once();
};

/**
 * verifies Dialer sendMessage method called twice for tx
 * @param channel
 * @param message
 */
const verifySendMessageCalledTwice = (channel: string, message: any): void => {
  verify(mockedDialerInstance.sendMessage(channel, deepEqual(message))).twice();
};

/**
 * verifies Dialer sendMessage method called once for tx
 * @param channel
 * @param message
 * @param receiver
 */
const verifySendMessageWithReceiverCalledOnce = (
  channel: string,
  message: any,
  receiver: string
): void => {
  verify(
    mockedDialerInstance.sendMessage(channel, deepEqual(message), receiver)
  ).once();
};

/**
 * verifies Dialer sendMessage method didn't get called once for tx
 * @param channel
 * @param message
 * @param receiver
 */
const verifySendMessageDidntGetCalled = (
  channel: string,
  message: any,
  receiver?: string
): void => {
  verify(mockedDialerInstance.sendMessage(channel, deepEqual(message))).never();
};

/**
 * reset call counts for mockedDialerInstance
 */
const resetDialerCalls = (): void => {
  resetCalls(mockedDialerInstance);
};

export {
  mockExistsSync,
  mockReadFileSync,
  resetMockedFS,
  sendMessageBodyAndPayloadArguments,
  verifySendMessageCalledOnce,
  verifySendMessageCalledTwice,
  verifySendMessageWithReceiverCalledOnce,
  verifySendMessageDidntGetCalled,
  resetDialerCalls,
};
