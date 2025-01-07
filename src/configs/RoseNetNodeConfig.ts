import config from 'config';
import { RelayInfo } from '../communication/Interfaces';
import { getConfigIntKeyOrDefault } from './Configs';

class RoseNetNodeConfig {
  static relays = config.get<string[]>('p2p.relays');
  static p2pFilePath: string = config.get<string>('p2p.filePath');
  static port: number = config.get<number>('p2p.port');
  // private static relaysInfo: RelayInfo[] =
  //   config.get<RelayInfo[]>('p2p.addresses');
  // static relays = {
  //   multiaddrs: this.relaysInfo.map((info) => info.address.concat(info.peerId)),
  //   peerIDs: this.relaysInfo.map((info) => info.peerId),
  // };
  static apiCallbackTimeout: number = getConfigIntKeyOrDefault(
    'p2p.apiCallbackTimeout',
    8
  ); // seconds
}

export default RoseNetNodeConfig;
