import config from 'config';

class CommunicationConfig {
  static relay: string = config.get<string>('p2p.address');
  static bootstrapInterval: number = config.get<number>(
    'p2p.bootstrapInterval'
  ); // seconds
  static pubsubInterval: number = config.get<number>('p2p.pubsubInterval'); // seconds
  static apiCallbackTimeout: number = config.get<number>(
    'p2p.apiCallbackTimeout'
  ); // seconds
  static peerIdFilePath: string = config.get<string>('p2p.peerIdFilePath');
}

export default CommunicationConfig;
