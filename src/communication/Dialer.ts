import { createLibp2p, Libp2p } from 'libp2p';
import { WebSockets } from '@libp2p/websockets';
import { Noise } from '@chainsafe/libp2p-noise';
import { Mplex } from '@libp2p/mplex';
import { pipe } from 'it-pipe';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Bootstrap } from '@libp2p/bootstrap';
import { PubSubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { FloodSub } from '@libp2p/floodsub';
import { Connection, Stream } from '@libp2p/interface-connection';
import { OPEN } from '@libp2p/interface-connection/status';
import * as lp from 'it-length-prefixed';
import map from 'it-map';
import { PeerId } from '@libp2p/interface-peer-id';
import { createEd25519PeerId, createFromJSON } from '@libp2p/peer-id-factory';
import * as multiaddr from '@multiformats/multiaddr';
import fs from 'fs';
import { PassThrough } from 'stream';
import { JsonBI } from '../network/NetworkModels';
import {
  ConnectionStream,
  ReceiveDataCommunication,
  ReceivePeers,
  SendDataCommunication,
  SubscribeChannel,
  SubscribeChannelFunction,
  SubscribeChannels,
} from './Interfaces';
import { logger, logThrowError } from '../log/Logger';
import CommunicationConfig from './CommunicationConfig';

// TODO: Need to write test for This package
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/21
class Dialer {
  private static instance: Dialer;

  private _NODE: Libp2p | undefined;
  private _SUBSCRIBED_CHANNELS: SubscribeChannels = {};
  private _PENDING_MESSAGE: SendDataCommunication[] = [];
  private _OUTPUT_STREAMS: Map<string, PassThrough> = new Map<
    string,
    PassThrough
  >();
  private readonly _SUPPORTED_PROTOCOL: Map<string, string> = new Map<
    string,
    string
  >([
    ['MSG', '/broadcast'],
    ['PEER', '/getpeers'],
  ]);

  private constructor() {
    logger.info('Create Dialer Instance!');
  }

  /**
   * @return a Dialer instance (create if it doesn't exist)
   */
  public static getInstance = async (): Promise<Dialer> => {
    if (!Dialer.instance) {
      Dialer.instance = new Dialer();
      await Dialer.instance.startDialer();
    }
    return Dialer.instance;
  };

  /**
   * return PeerID or create PeerID if it doesn't exist
   * @return PeerID
   */
  static getOrCreatePeerID = async (): Promise<{
    peerId: PeerId;
    exist: boolean;
  }> => {
    if (!fs.existsSync(CommunicationConfig.peerIdFilePath)) {
      return {
        peerId: await createEd25519PeerId(),
        exist: false,
      } as const;
    } else {
      const jsonData: string = fs.readFileSync(
        CommunicationConfig.peerIdFilePath,
        'utf8'
      );
      const peerIdDialerJson = await JSON.parse(jsonData);
      return {
        peerId: await createFromJSON(peerIdDialerJson),
        exist: true,
      };
    }
  };

  /**
   * If it didn't exist PeerID file, this function try to create a file and save peerId into that
   * @param peerObj { peerId: PeerId; exist: boolean }
   */
  static savePeerIdIfNeed = async (peerObj: {
    peerId: PeerId;
    exist: boolean;
  }): Promise<void> => {
    if (!peerObj.exist) {
      const peerId = peerObj.peerId;
      let privateKey: Uint8Array;
      let publicKey: Uint8Array;
      if (peerId.privateKey && peerId.publicKey) {
        privateKey = peerId.privateKey;
        publicKey = peerId.publicKey;
      } else throw Error('PrivateKey for p2p is required');

      const peerIdDialerJson = {
        id: peerId.toString(),
        privKey: uint8ArrayToString(privateKey, 'base64pad'),
        pubKey: uint8ArrayToString(publicKey, 'base64pad'),
      };
      const jsonData = JSON.stringify(peerIdDialerJson);
      fs.writeFile(
        CommunicationConfig.peerIdFilePath,
        jsonData,
        'utf8',
        function (err) {
          if (err) {
            logger.log(
              'fatal',
              'an error occurred, in writing created PeerId to the file'
            );
            throw err;
          }
          logger.info('PeerId created!');
        }
      );
    }
  };

  /**
   * @return list of subscribed channels' name
   */
  getSubscribedChannels = (): string[] => {
    return Object.keys(this._SUBSCRIBED_CHANNELS);
  };

  /**
   * @return Dialer's Id
   */
  getDialerId = (): string => {
    if (!this._NODE) {
      logThrowError("dialer node isn't ready, please try later", 'fatal');
    }
    return this._NODE!.peerId.toString();
  };

  /**
   * @return string of PeerID
   */
  getPeerIds = (): string[] => {
    if (!this._NODE) {
      logThrowError("dialer node isn't ready, please try later", 'fatal');
    }
    return this._NODE!.getPeers().map((peer) => peer.toString());
  };

  /**
   * establish connection to relay
   * @param channel: string desire channel for subscription
   * @param callback: a callback function for subscribed channel
   * @param url: string for apiCallbackFunction
   */
  subscribeChannel = (
    channel: string,
    callback: SubscribeChannelFunction,
    url?: string
  ): void => {
    const callbackObj: SubscribeChannel = {
      func: callback,
    };
    if (url) callbackObj.url = url;

    if (this._SUBSCRIBED_CHANNELS[channel]) {
      if (
        this._SUBSCRIBED_CHANNELS[channel].find(
          (sub: SubscribeChannel) =>
            sub.func.name === callback.name && sub.url === url
        )
      ) {
        logger.info('a redundant subscribed channel detected !');
        return;
      }
      this._SUBSCRIBED_CHANNELS[channel].push(callbackObj);
    } else {
      this._SUBSCRIBED_CHANNELS[channel] = [];
      this._SUBSCRIBED_CHANNELS[channel].push(callbackObj);
    }
  };

  /**
   * send message to specific peer or broadcast it
   * @param channel: String
   * @param msg: string
   * @param receiver optional
   */
  sendMessage = async (
    channel: string,
    msg: string,
    receiver?: string
  ): Promise<void> => {
    const data: SendDataCommunication = {
      msg: msg,
      channel: channel,
    };
    if (receiver) data.receiver = receiver;
    if (!this._NODE) {
      this._PENDING_MESSAGE.push(data);
      logger.warn(
        "message added to pending list due to dialer node isn't ready"
      );
      return;
    }

    if (receiver) {
      const receiverPeerId = await createFromJSON({ id: `${receiver}` });
      this.streamForPeer(this._NODE, receiverPeerId, data);
    } else {
      // send message for listener peers (not relays)
      const peers = this._NODE
        .getPeers()
        .filter(
          (peer) =>
            !CommunicationConfig.relays.peerIDs.includes(peer.toString())
        );
      for (const peer of peers) {
        this.streamForPeer(this._NODE, peer, data);
      }
    }
  };

  /**
   * resend pending messages
   */
  sendPendingMessage = async (): Promise<void> => {
    const resendMessage = async (
      value: SendDataCommunication
    ): Promise<void> => {
      (await value.receiver)
        ? await this.sendMessage(value.channel, value.msg, value.receiver)
        : await this.sendMessage(value.channel, value.msg);
    };

    if (this._PENDING_MESSAGE.length > 0) {
      await this._PENDING_MESSAGE.forEach(await resendMessage);
    }
  };

  /**
   * store relay's peerIDs to PeerStore
   * @param peers id of peers
   */
  storePeers = async (peers: string[]): Promise<void> => {
    try {
      if (this._NODE) {
        for (const peer of peers) {
          for (const addr of CommunicationConfig.relays.multiaddrs) {
            const multi = multiaddr.multiaddr(
              addr.concat(`/p2p-circuit/p2p/${peer}`)
            );
            this._NODE?.peerStore.addressBook.set(
              await createFromJSON({ id: `${peer}` }),
              [multi]
            );
            await this._NODE?.dialProtocol(
              multi,
              this._SUPPORTED_PROTOCOL.get('PEER')!
            );
            logger.info(`a peer with peerID [${peer}] added`);
          }
        }
      }
    } catch (e) {
      logger.warn(`an error occurred for store discovered peer: [${e}]`);
    }
  };

  /**
   * create or find an open stream for specific peer and protocol
   * @param node
   * @param peer create or find stream for peer
   * @param protocol try to create a stream with this protocol
   */
  private getOpenStream = async (
    node: Libp2p,
    peer: PeerId,
    protocol: string
  ): Promise<ConnectionStream> => {
    let connection: Connection | undefined = undefined;
    let stream: Stream | undefined = undefined;
    for await (const conn of node.getConnections(peer)) {
      if (conn.stat.status === OPEN) {
        for await (const obj of conn.streams) {
          if (obj.stat.protocol === protocol) {
            stream = obj;
            break;
          }
        }
        connection = conn;
        if (stream) break;
        else stream = await conn.newStream([protocol]);
      } else await conn.close();
    }
    if (!connection) {
      connection = await node.dial(peer);
      stream = await connection.newStream([protocol]);
    }
    if (!stream) stream = await connection.newStream([protocol]);
    return {
      stream: stream,
      connection: connection,
    };
  };

  /**
   * write data on stream for a peer
   * @param node
   * @param peer
   * @param messageToSend
   */
  private streamForPeer = async (
    node: Libp2p,
    peer: PeerId,
    messageToSend: SendDataCommunication
  ): Promise<void> => {
    let outputStream: PassThrough | undefined;

    const connStream = await this.getOpenStream(
      node,
      peer,
      this._SUPPORTED_PROTOCOL.get('MSG')!
    );
    const passThroughName = `${peer.toString()}-${this._SUPPORTED_PROTOCOL.get(
      'MSG'
    )!}-${connStream.stream.id}`;

    if (this._OUTPUT_STREAMS.has(passThroughName)) {
      outputStream = this._OUTPUT_STREAMS.get(passThroughName);
    } else {
      const outStream = new PassThrough();
      this._OUTPUT_STREAMS.set(passThroughName, outStream);
      outputStream = outStream;
      pipe(outputStream, lp.encode(), connStream.stream).catch((e) => {
        logger.error(e);
        connStream.stream.close();
        this._OUTPUT_STREAMS.delete(passThroughName);
        this._PENDING_MESSAGE.push(messageToSend);
        logger.warn(
          "message added to pending list due to dialer node isn't ready"
        );
      });
    }

    if (outputStream) {
      // Give time for the stream to flush.
      await new Promise((resolve) =>
        setTimeout(resolve, CommunicationConfig.timeToFlushStream * 1000)
      );
      // Send some outgoing data.
      outputStream.write(JsonBI.stringify(messageToSend));
    } else {
      logger.error(`doesn't exist output pass through for ${passThroughName}`);
    }
  };

  /**
   * handle incoming messages with broadcast protocol
   * @param stream
   * @param connection
   */
  private handleBroadcast = async (
    stream: Stream,
    connection: Connection
  ): Promise<void> => {
    try {
      pipe(
        // Read from the stream (the source)
        stream.source,
        // Decode length-prefixed data
        lp.decode(),
        // Turn buffers into strings
        (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
        // Sink function
        async (source) => {
          // For each chunk of data
          for await (const msg of source) {
            const receivedData: ReceiveDataCommunication = await JsonBI.parse(
              msg.toString()
            );

            const runSubscribeCallback = async (value: any): Promise<void> => {
              value.url
                ? value.func(
                    receivedData.msg,
                    receivedData.channel,
                    connection.remotePeer.toString(),
                    value.url
                  )
                : value.func(
                    receivedData.msg,
                    receivedData.channel,
                    connection.remotePeer.toString()
                  );
            };
            if (this._SUBSCRIBED_CHANNELS[receivedData.channel]) {
              logger.info(
                `received a message from [${connection.remotePeer.toString()}]
             in a subscribed channel [${receivedData.channel} ]`
              );
              this._SUBSCRIBED_CHANNELS[receivedData.channel].forEach(
                runSubscribeCallback
              );
            } else
              logger.warn(
                `received a message from [${connection.remotePeer.toString()}] in a unsubscribed channel [${
                  receivedData.channel
                }]`
              );
          }
        }
      );
    } catch (e) {
      logger.warn(
        `an error occurred for handle broadcast protocol stream: [${e}]`
      );
    }
  };

  /**
   * handle incoming messages for broadcast protocol
   * @param node
   * @param stream
   * @param connection
   */
  private handlePeerDiscovery = async (
    node: Libp2p,
    stream: Stream,
    connection: Connection
  ): Promise<void> => {
    try {
      pipe(
        // Read from the stream (the source)
        stream.source,
        // Decode length-prefixed data
        lp.decode(),
        // Turn buffers into strings
        (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
        // Sink function
        async (source) => {
          // For each chunk of data
          for await (const msg of source) {
            if (
              CommunicationConfig.relays.peerIDs.includes(
                connection.remotePeer.toString()
              )
            ) {
              const receivedData: ReceivePeers = await JsonBI.parse(
                msg.toString()
              );
              const nodePeerIds = node
                .getPeers()
                .map((peer) => peer.toString());
              await this.storePeers(
                receivedData.peerIds.filter(
                  (mainPeer) => !nodePeerIds.includes(mainPeer)
                )
              );
            }
          }
        }
      );
    } catch (e) {
      logger.warn(
        `an error occurred for handle getpeers protocol stream: [${e}]`
      );
    }
  };

  /**
   *
   * config a dialer node with peerDiscovery
   * @return a Libp2p object after start node
   */
  private startDialer = async (): Promise<void> => {
    try {
      const peerId = await Dialer.getOrCreatePeerID();
      const node = await createLibp2p({
        // get or create new PeerID if it doesn't exist
        peerId: peerId.peerId,
        // Type of communication
        transports: [new WebSockets()],
        // Enable module encryption message
        connectionEncryption: [new Noise()],
        streamMuxers: [
          // Mplex is a Stream Multiplexer protocol
          new Mplex(),
        ],
        relay: {
          // Circuit Relay options (this config is part of libp2p core configurations)
          enabled: true, // Allows you to dial and accept relayed connections.
        },
        connectionManager: {
          autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minConnections)
          // The `tag` property will be searched when creating the instance of your Peer Discovery service.
          // The associated object, will be passed to the service when it is instantiated.
        },
        pubsub: new FloodSub(), // Active peer discovery and bootstrap peers
        peerDiscovery: [
          new Bootstrap({
            interval: CommunicationConfig.bootstrapInterval * 1000,
            list: CommunicationConfig.relays.multiaddrs,
          }),
          new PubSubPeerDiscovery({
            interval: CommunicationConfig.pubsubInterval * 1000,
          }),
        ],
      });

      // Listen for peers disconnecting
      node.connectionManager.addEventListener('peer:disconnect', (evt) => {
        this._OUTPUT_STREAMS.forEach((value, key) => {
          if (key.includes(evt.detail.remotePeer.toString()))
            this._OUTPUT_STREAMS.delete(key);
        });
      });

      // Define protocol for node
      await node.handle(
        this._SUPPORTED_PROTOCOL.get('MSG')!,
        async ({ stream, connection }) => {
          // Read the stream
          this.handleBroadcast(stream, connection);
        }
      );

      // Handle messages for the _SUPPORTED_PROTOCOL_PEERS
      await node.handle(
        this._SUPPORTED_PROTOCOL.get('PEER')!,
        async ({ stream, connection }) => {
          // Read the stream
          this.handlePeerDiscovery(node, stream, connection);
        }
      );

      node.start();
      logger.info(`Dialer node started with peerId: ${node.peerId.toString()}`);

      this._NODE = await node;

      // this should call after createRelayConnection duo to peerId should save after create relay connection
      await Dialer.savePeerIdIfNeed(peerId);

      new Promise(() =>
        setInterval(
          this.sendPendingMessage,
          CommunicationConfig.sendPendingMessage * 1000
        )
      );

      new Promise(() =>
        setInterval(() => {
          logger.info(`peers are [${this.getPeerIds()}]`);
        }, CommunicationConfig.getPeersInterval * 1000)
      );
    } catch (e) {
      logger.log('fatal', `an error occurred for start dialer: [${e}]`);
    }
  };
}

export default Dialer;
