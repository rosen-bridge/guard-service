import config from 'config';

class CommunicationConfig {
  static server: string = config.get<string>('p2p.address');
  static pullInterval: number = config.get<number>('p2p.pullInterval'); // seconds
  static apiCallbackTimeout: number = config.get<number>(
    'p2p.apiCallbackTimeout'
  ); // seconds
  static peerIdFilePath: string = config.get<string>('p2p.peerIdFilePath');
}

export default CommunicationConfig;
