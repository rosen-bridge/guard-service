import config from 'config';
import { RelayInfo } from './Interfaces';
import { getConfigIntKeyOrDefault } from '../helpers/Configs';

class CommunicationConfig {
  private static relaysInfo: RelayInfo[] =
    config.get<RelayInfo[]>('p2p.addresses');
  static relays = {
    multiaddrs: this.relaysInfo.map((info) => info.address.concat(info.peerId)),
    peerIDs: this.relaysInfo.map((info) => info.peerId),
  };
  static bootstrapTimeout: number = getConfigIntKeyOrDefault(
    'p2p.bootstrapTimeout',
    10
  ); // seconds
  static pubsubInterval: number = getConfigIntKeyOrDefault(
    'p2p.pubsubInterval',
    10
  ); // seconds
  static apiCallbackTimeout: number = getConfigIntKeyOrDefault(
    'p2p.apiCallbackTimeout',
    8
  ); // seconds
  static loggingInterval: number = getConfigIntKeyOrDefault(
    'p2p.loggingInterval',
    60
  ); // seconds
  static peerIdFilePath: string = config.get<string>('p2p.peerIdFilePath');
  static messageSendingRetriesExponentialFactor: number =
    getConfigIntKeyOrDefault('p2p.messageSendingRetriesExponentialFactor', 5);
  static messageSendingRetriesMaxCount = BigInt(
    getConfigIntKeyOrDefault('p2p.messageSendingRetriesMaxCount', 3)
  );
  static guardsCount: number = getConfigIntKeyOrDefault('p2p.guardsCount', 30);
  static allowedStreamsPerGuard: number = getConfigIntKeyOrDefault(
    'p2p.allowedStreamsPerGuard',
    3
  );
  static relayReconnectionInterval: number = getConfigIntKeyOrDefault(
    'p2p.relayReconnectionInterval',
    30
  );
}

export default CommunicationConfig;
