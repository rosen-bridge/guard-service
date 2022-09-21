type SubscribeChannelFunction =
  | ((msg: string, channel: string, sender: string) => void)
  | ((msg: string, channel: string, sender: string, url: string) => void);

interface SubscribeChannel {
  func: SubscribeChannelFunction;
  url?: string;
}

interface SubscribeChannels {
  [id: string]: Array<SubscribeChannel>;
}

interface SendDataCommunication {
  msg: string;
  channel: string;
  receiver?: string;
}

interface ReceiveDataCommunication {
  msg: string;
  channel: string;
  sender: string;
  receiver?: string;
}

export {
  SubscribeChannelFunction,
  SendDataCommunication,
  ReceiveDataCommunication,
  SubscribeChannels,
  SubscribeChannel,
};
