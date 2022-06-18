interface SubscribeChannel {
    (msg: any, channel: string, sender: string): void;

    (msg: any, channel: string, sender: string, url: string): void;
}

interface SendDataCommunication {
    msg: any
    channel: string
    receiver?: string
}

interface ReceiveDataCommunication {
    msg: any
    channel: string
    sender: string
    receiver?: string
}

export { SubscribeChannel, SendDataCommunication, ReceiveDataCommunication }
