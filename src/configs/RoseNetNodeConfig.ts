import config from 'config';
import { getConfigIntKeyOrDefault } from './Configs';

class RoseNetNodeConfig {
  static relays = config.get<string[]>('p2p.relays');
  static peerIdFilePath: string = config.get<string>('p2p.peerIdFilePath');
  static host: string = config.get<string>('p2p.host');
  static port: number = config.get<number>('p2p.port');
  static apiCallbackTimeout: number = getConfigIntKeyOrDefault(
    'p2p.apiCallbackTimeout',
    8
  ); // seconds
}

export default RoseNetNodeConfig;
