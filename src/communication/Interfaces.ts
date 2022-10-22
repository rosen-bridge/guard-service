import { Connection, Stream } from '@libp2p/interface-connection';

interface SubscribeChannelWithURL {
  func: (msg: string, channel: string, sender: string, url: string) => void;
  url: string;
}
interface SubscribeChannelWithoutURL {
  func: (msg: string, channel: string, sender: string) => void;
}
type SubscribeChannel = SubscribeChannelWithURL | SubscribeChannelWithoutURL;

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
  receiver?: string;
}

interface ReceivePeers {
  peerIds: string[];
}

interface ConnectionStream {
  connection: Connection;
  stream: Stream;
}

interface RelayInfo {
  peerId: string;
  address: string;
}

export {
  SendDataCommunication,
  ReceiveDataCommunication,
  SubscribeChannels,
  SubscribeChannelWithURL,
  SubscribeChannelWithoutURL,
  SubscribeChannel,
  ConnectionStream,
  RelayInfo,
  ReceivePeers,
};
