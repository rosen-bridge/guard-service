import { anyString, resetCalls, spy, verify, when } from 'ts-mockito';
import DiscordNotification from '../../../src/communication/notification/DiscordNotification';

const mockedDiscordNotification = spy(DiscordNotification);
when(mockedDiscordNotification.sendMessage(anyString())).thenResolve();

/**
 * verifies DiscordNotification sendMessage method called once
 */
const verifyDiscordSendMessageCalledOnce = (): void => {
  verify(mockedDiscordNotification.sendMessage(anyString())).once();
};

/**
 * reset call counts for mockedDiscordNotification
 */
const resetDiscordNotificationCalls = (): void => {
  resetCalls(mockedDiscordNotification);
};

export { verifyDiscordSendMessageCalledOnce, resetDiscordNotificationCalls };
