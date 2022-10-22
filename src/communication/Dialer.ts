import { createLibp2p, Libp2p } from 'libp2p';
import { WebSockets } from '@libp2p/websockets';
import { Noise } from '@chainsafe/libp2p-noise';
import { Mplex } from '@libp2p/mplex';
import { pipe } from 'it-pipe';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { Bootstrap } from '@libp2p/bootstrap';
import { PubSubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
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
import { logger } from '../log/Logger';
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
  private _DISCONNECTED_PEER: Set<string> = new Set<string>();

  private constructor() {
    logger.info('Create Dialer Instance!');
  }

  /**
   * @return a Dialer instance (create if it doesn't exist)
   */
  public static getInstance = async (): Promise<Dialer> => {
    try {
      if (!Dialer.instance) {
        Dialer.instance = new Dialer();
        await Dialer.instance.startDialer();
      }
    } catch (e) {
      throw Error(`An error occurred for start Dialer: ${e}`);
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
    try {
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
    } catch (e) {
      throw new Error(`Couldn't get or create a PeerID: ${e}`);
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
      } else throw new Error('PrivateKey for p2p is required');

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
            logger.error(
              `An error occurred, in writing created PeerId to the file: ${err}`
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
      throw new Error("Dialer node isn't ready, please try later");
    }
    return this._NODE!.peerId.toString();
  };

  /**
   * @return string of PeerID
   */
  getPeerIds = (): string[] => {
    if (!this._NODE) {
      throw new Error("Dialer node isn't ready, please try later");
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
        logger.info('A redundant subscribed channel detected!');
        return;
      }
      this._SUBSCRIBED_CHANNELS[channel].push(callbackObj);
      logger.info(`Channel [${channel}] subscribed!`);
    } else {
      this._SUBSCRIBED_CHANNELS[channel] = [];
      this._SUBSCRIBED_CHANNELS[channel].push(callbackObj);
      logger.info(`Channel [${channel}] subscribed!`);
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
        "Message added to pending list due to dialer node isn't ready"
      );
      return;
    }

    // try to connect to disconnected peers
    await this.addPeers(Array.from(this._DISCONNECTED_PEER));

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
   * store dialers' peerID to PeerStore
   * @param peers id of peers
   */
  addPeers = async (peers: string[]): Promise<void> => {
    if (this._NODE) {
      for (const peer of peers) {
        try {
          for (const addr of CommunicationConfig.relays.multiaddrs) {
            const multi = multiaddr.multiaddr(
              addr.concat(`/p2p-circuit/p2p/${peer}`)
            );
            logger.warn(this.getPeerIds().includes(peer));
            if (!this.getPeerIds().includes(peer)) {
              this._NODE?.peerStore.addressBook
                .set(await createFromJSON({ id: `${peer}` }), [multi])
                .catch((err) => {
                  logger.warn(err);
                });
              this._NODE
                ?.dialProtocol(multi, this._SUPPORTED_PROTOCOL.get('MSG')!)
                .catch((err) => {
                  logger.warn(err);
                });
              this._DISCONNECTED_PEER.delete(peer);
              logger.info(`a peer with peerID [${peer}] added`);
            }
          }
        } catch (e) {
          logger.warn(`An error occurred for store discovered peer: ${e}`);
        }
      }
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
    /**
     * TODO: To use connections optimally, we can start only one connection between
     * two guards (instead of current two streams, one inbound and one outbound.)
     * As connections are bidirectional, we can create a new stream in the
     * connection, no matter its direction.
     */
    for await (const conn of node.getConnections(peer)) {
      if (conn.stat.status === OPEN && conn.stat.direction == 'outbound') {
        for await (const obj of conn.streams) {
          if (obj.stat.protocol === protocol) {
            stream = obj;
            break;
          }
        }
        connection = conn;
        if (stream) break;
        else stream = await conn.newStream([protocol]);
      }
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
    try {
      let outputStream: PassThrough | undefined;

      const connStream = await this.getOpenStream(
        node,
        peer,
        this._SUPPORTED_PROTOCOL.get('MSG')!
      );
      logger.debug(
        `Get connection [${connStream.connection}] and stream [${connStream.stream}] for peer [${peer}]`
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
          logger.error(`An error occurred for write to stream ${e}`);
          connStream.stream.close();
          this._OUTPUT_STREAMS.delete(passThroughName);
          this._PENDING_MESSAGE.push(messageToSend);
          logger.warn(
            "Message added to pending list due to dialer node isn't ready"
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
        logger.error(
          `Doesn't exist output pass through for ${passThroughName}`
        );
      }
    } catch (e) {
      logger.error(
        `An error occurred for write data on stream for peer [${peer}]: ${e}`
      );
      logger.debug(`message is [${messageToSend}]`);
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
    pipe(
      // Read from the stream (the source)
      stream.source,
      // Decode length-prefixed data
      lp.decode(),
      // Turn buffers into strings
      (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
      // Sink function
      async (source) => {
        try {
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
                `Received a message from [${connection.remotePeer.toString()}] in a subscribed channel [${
                  receivedData.channel
                }]`
              );
              logger.debug(`Received msg with data [${receivedData.msg}]`);
              this._SUBSCRIBED_CHANNELS[receivedData.channel].forEach(
                runSubscribeCallback
              );
            } else
              logger.warn(
                `Received a message from [${connection.remotePeer.toString()}] in a unsubscribed channel [${
                  receivedData.channel
                }]`
              );
          }
        } catch (e) {
          logger.warn(`An error occurred for handle stream callback: ${e}`);
        }
      }
    ).catch((e) => {
      logger.warn(
        `An error occurred for handle broadcast protocol stream: ${e}`
      );
    });
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
    pipe(
      // Read from the stream (the source)
      stream.source,
      // Decode length-prefixed data
      lp.decode(),
      // Turn buffers into strings
      (source) => map(source, (buf) => uint8ArrayToString(buf.subarray())),
      // Sink function
      async (source) => {
        try {
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
              await this.addPeers(
                receivedData.peerIds.filter(
                  (mainPeer) => !nodePeerIds.includes(mainPeer)
                )
              );
            }
          }
        } catch (e) {
          logger.warn(`An error occurred for handle stream callback: ${e}`);
        }
      }
    ).catch((e) => {
      logger.warn(
        `An error occurred for handle getpeers protocol stream: ${e}`
      );
    });
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
          /**
           * Auto connect to discovered peers (limited by ConnectionManager minConnections)
           * The `tag` property will be searched when creating the instance of your Peer Discovery service.
           * The associated object, will be passed to the service when it is instantiated.
           */
          autoDial: true,
          /**
           * The total number of connections allowed to be open at one time
           */
          maxConnections: 200,

          /**
           * If the number of open connections goes below this number, the node
           * will try to connect to nearby peers from the peer store
           */
          minConnections: 20,
        },
        pubsub: new GossipSub({ allowPublishToZeroPeers: true }),
        peerDiscovery: [
          new Bootstrap({
            timeout: CommunicationConfig.bootstrapTimeout * 1000,
            list: CommunicationConfig.relays.multiaddrs,
          }),
          new PubSubPeerDiscovery({
            interval: CommunicationConfig.pubsubInterval * 1000,
          }),
        ],
      });

      // Listen for peers disconnecting
      node.connectionManager.addEventListener('peer:disconnect', (evt) => {
        logger.info(`Peer [${evt.detail.remotePeer.toString()}] Disconnected!`);
        this._DISCONNECTED_PEER.add(evt.detail.remotePeer.toString());
        this._OUTPUT_STREAMS.forEach((value, key) => {
          if (key.includes(evt.detail.remotePeer.toString()))
            this._OUTPUT_STREAMS.delete(key);
        });
      });

      // Listen for new peers
      node.addEventListener('peer:discovery', (evt) => {
        logger.info(`Found peer ${evt.detail.id.toString()}`);
        // dial them when we discover them
        if (
          !CommunicationConfig.relays.peerIDs.includes(evt.detail.id.toString())
        ) {
          this.addPeers([evt.detail.id.toString()]).catch((err) => {
            logger.warn(`Could not dial ${evt.detail.id}`, err);
          });
        }
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

      // await node.pubsub.subscribe(this._SUPPORTED_PROTOCOL.get('MSG')!)

      // this should call after createRelayConnection duo to peerId should save after create relay connection
      await Dialer.savePeerIdIfNeed(peerId);

      // Job for send pending message
      new Promise(() =>
        setInterval(
          this.sendPendingMessage,
          CommunicationConfig.sendPendingMessage * 1000
        )
      );

      // Job for log all peers
      new Promise(() =>
        setInterval(() => {
          logger.info(`peers are [${this.getPeerIds()}]`);
        }, CommunicationConfig.getPeersInterval * 1000)
      );

      // // Job for connect to disconnected peers
      new Promise(() =>
        setInterval(() => {
          this.addPeers(Array.from(this._DISCONNECTED_PEER));
        }, CommunicationConfig.connectToDisconnectedPeersInterval * 1000)
      );
    } catch (e) {
      logger.error(`An error occurred for start dialer: ${e}`);
    }
  };
}

export default Dialer;
