import config from 'config';
import { getConfigIntKeyOrDefault } from './Configs';

class RoseNetNodeConfig {
  static relays = config.get<string[]>('p2p.relays');
  static peerIdFilePath = config.get<string>('p2p.peerIdFilePath');
  static host = config.get<string>('p2p.host');
  static port = config.get<number>('p2p.port');
  static apiCallbackTimeout = getConfigIntKeyOrDefault(
    'p2p.apiCallbackTimeout',
    8
  ); // seconds
}

export default RoseNetNodeConfig;
