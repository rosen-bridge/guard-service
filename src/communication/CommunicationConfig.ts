import config from 'config';
import { RelayInfo } from './Interfaces';

class CommunicationConfig {
  private static relaysInfo: RelayInfo[] =
    config.get<RelayInfo[]>('p2p.addresses');
  static relays = {
    multiaddrs: this.relaysInfo.map((info) => info.address.concat(info.peerId)),
    peerIDs: this.relaysInfo.map((info) => info.peerId),
  };
  static bootstrapTimeout: number = config.get<number>('p2p.bootstrapTimeout'); // seconds
  static pubsubInterval: number = config.get<number>('p2p.pubsubInterval'); // seconds
  static connectToDisconnectedPeersInterval: number = config.get<number>(
    'p2p.connectToDisconnectedPeersInterval'
  ); // seconds
  static apiCallbackTimeout: number = config.get<number>(
    'p2p.apiCallbackTimeout'
  ); // seconds
  static timeToFlushStream: number = config.get<number>(
    'p2p.timeToFlushStream'
  ); // seconds
  static sendPendingMessage: number = config.get<number>(
    'p2p.sendPendingMessage'
  ); // seconds
  static getPeersInterval: number = config.get<number>('p2p.getPeersInterval'); // seconds
  static peerIdFilePath: string = config.get<string>('p2p.peerIdFilePath');
}

export default CommunicationConfig;
