import config from "config";

class CommunicationConfig {
    static relay: string = config.get<string>('p2p.address')
    static bootstrapInterval: number = config.get<number>('p2p.bootstrapInterval')
    static pubsubInterval: number = config.get<number>('p2p.pubsubInterval')
    static apiCallbackTimeout: number = config.get<number>('p2p.apiCallbackTimeout')
    static peerIdFilePath: string = config.get<string>('p2p.peerIdFilePath')
}

export default CommunicationConfig
