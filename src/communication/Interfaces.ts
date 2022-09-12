import { Connection, Stream } from "@libp2p/interface-connection";

type SubscribeChannelFunction =
    ((msg: string, channel: string, sender: string) => void) |
    ((msg: string, channel: string, sender: string, url: string) => void)

interface SubscribeChannel {
    func: SubscribeChannelFunction
    url?: string
}

interface SubscribeChannels {
    [id: string]: Array<SubscribeChannel>
}

interface SendDataCommunication {
    msg: string
    channel: string
    receiver?: string
}

interface ReceiveDataCommunication {
    msg: string
    channel: string
    receiver?: string
}

interface ConnectionStream {
    connection: Connection
    stream: Stream
}

interface RelayInfo {
    peerId: string
    address: string
}

export {
    SubscribeChannelFunction,
    SendDataCommunication,
    ReceiveDataCommunication,
    SubscribeChannels,
    SubscribeChannel,
    ConnectionStream,
    RelayInfo
}
