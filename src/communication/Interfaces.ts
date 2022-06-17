interface SubscribeChannel {
    (msg: any, channel: string, sender: string): void;
    (msg: any, channel: string, sender: string, url: string): void;
}

interface SendDataCommunication {
    msg: string
    channel: string
    receiver?: string
}

interface ReceiveDataCommunication {
    msg: string
    channel: string
    sender: string
    receiver?: string
}

export {SubscribeChannel, SendDataCommunication, ReceiveDataCommunication}
