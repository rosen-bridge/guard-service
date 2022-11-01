type MessageCallback = (msg: string, channel: string, sender: string) => void;

interface SubscribeFn {
  func: MessageCallback;
  id: string;
}

interface SubscribeUrl {
  url: string;
}

interface SubscribeChannel {
  functions: Array<SubscribeFn>;
  urls: Array<SubscribeUrl>;
}

interface Subscription {
  [id: string]: SubscribeChannel;
}

interface SendDataCommunication {
  msg: string;
  channel: string;
  receiver?: string;
}

export {
  MessageCallback,
  SubscribeFn,
  SubscribeUrl,
  SubscribeChannel,
  Subscription,
  SendDataCommunication,
};
