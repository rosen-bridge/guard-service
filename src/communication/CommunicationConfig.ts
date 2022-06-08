import config from "config";

class CommunicationConfig {
    static relay: string = config.get<string>('relay.address')
    static bootstrapInterval: number = config.get<number>('relay.bootstrapInterval')
    static pubsubInterval: number = config.get<number>('relay.pubsubInterval')
}

export default CommunicationConfig