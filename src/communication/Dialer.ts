import fs from 'fs';
import * as lp from 'it-length-prefixed';
import map from 'it-map';
import { pipe } from 'it-pipe';
import { pushable, Pushable } from 'it-pushable';
import { createLibp2p, Libp2p, Libp2pInit } from 'libp2p';
import {
  fromString as uint8ArrayFromString,
  toString as uint8ArrayToString,
} from 'uint8arrays';

import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { noise } from '@chainsafe/libp2p-noise';

import { bootstrap } from '@libp2p/bootstrap';
import { Connection, Stream } from '@libp2p/interface-connection';
import { OPEN } from '@libp2p/interface-connection/status';
import { PeerId } from '@libp2p/interface-peer-id';
import { mplex } from '@libp2p/mplex';
import { createEd25519PeerId, createFromJSON } from '@libp2p/peer-id-factory';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { webSockets } from '@libp2p/websockets';

import * as multiaddr from '@multiformats/multiaddr';

import CommunicationConfig from './CommunicationConfig';
import {
  ConnectionStream,
  ReceiveDataCommunication,
  ReceivePeers,
  SendDataCommunication,
  SubscribeChannel,
  SubscribeChannels,
  SubscribeChannelWithURL,
} from './Interfaces';
import { logger } from '../log/Logger';
import { JsonBI } from '../network/NetworkModels';

const MESSAGE_SENDING_RETRIES_EXPONENTIAL_FACTOR = 5;
const MESSAGE_SENDING_RETRIES_MAX_COUNT = 3n;

/**
 * TODO: This is needed because of an issue in types of `@libp2p/pubsub-peer-discovery`
 * which mismatch with types of `libp2p`
 *
 * https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/86
 */
type PeerDiscoveryArray = Libp2pInit['peerDiscovery'];
type PeerDiscovery = PeerDiscoveryArray extends
  | readonly (infer ElementType)[]
  | undefined
  ? ElementType
  : never;

// TODO: Need to write test for This package
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/21
class Dialer {
  private static instance: Dialer;

  private _disconnectedPeers = new Set<string>();
  private _messageQueue = pushable();
  private _node: Libp2p | undefined;
  private _pendingDialPeers: string[] = [];
  private _subscribedChannels: SubscribeChannels = {};

  private readonly _SUPPORTED_PROTOCOL = new Map<string, string>([
    ['MSG', '/broadcast'],
    ['PEER', '/getpeers'],
  ]);

  private constructor() {
    logger.info('Create Dialer Instance!');
  }

  /**
   * @return a Dialer instance (create if it doesn't exist)
   */
  public static getInstance = async () => {
    try {
      if (!Dialer.instance) {
        Dialer.instance = new Dialer();
        await Dialer.instance.startDialer();
        Dialer.instance.processMessageQueue();
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
        const jsonData = fs.readFileSync(
          CommunicationConfig.peerIdFilePath,
          'utf8'
        );
        const peerIdDialerJson: Parameters<typeof createFromJSON>['0'] =
          JSON.parse(jsonData);
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
  static savePeerIdIfNeeded = async (peerObj: {
    peerId: PeerId;
    exist: boolean;
  }) => {
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
   * Only used for Typescript narrowing.
   * @returns if channel has URL
   */
  private hasUrl = (
    channel: SubscribeChannel
  ): channel is SubscribeChannelWithURL =>
    !!(channel as SubscribeChannelWithURL).url;

  /**
   * @return list of subscribed channels' name
   */
  getSubscribedChannels = () => {
    return Object.keys(this._subscribedChannels);
  };

  /**
   * @return Dialer's Id
   */
  getDialerId = () => {
    if (!this._node) {
      throw new Error("Dialer node isn't ready, please try later");
    }
    return this._node.peerId.toString();
  };

  /**
   * @return string of PeerID
   */
  getPeerIds = () => {
    if (!this._node) {
      throw new Error("Dialer node isn't ready, please try later");
    }
    return this._node.getPeers().map((peer) => peer.toString());
  };

  /**
   * establish connection to relay
   * @param channel: string desire channel for subscription
   * @param callback: a callback function for subscribed channel
   * @param url: string for apiCallbackFunction
   */
  subscribeChannel = (
    channel: string,
    callback: SubscribeChannel['func'],
    url?: string
  ) => {
    const callbackObj = {
      func: callback,
      ...(url && { url }),
    } as SubscribeChannel;

    if (this._subscribedChannels[channel]) {
      if (
        this._subscribedChannels[channel].find(
          (sub) =>
            sub.func.name === callback.name &&
            ((this.hasUrl(sub) && sub.url === url) || !url)
        )
      ) {
        logger.info('A redundant subscribed channel detected!');
        return;
      }
      this._subscribedChannels[channel].push(callbackObj);
      logger.info(`Channel [${channel}] subscribed!`);
    } else {
      this._subscribedChannels[channel] = [];
      this._subscribedChannels[channel].push(callbackObj);
      logger.info(`Channel [${channel}] subscribed!`);
    }
  };

  /**
   * TODO: This method is not written in arrow form because ts-mockito has some
   * issues with mocking class fields which are of type arrow function. If you
   * are going to convert it to an arrow method, make sure all tests pass without
   * issue.
   */
  /**
   * send message to specific peer or broadcast it
   * @param channel: String
   * @param msg: string
   * @param receiver optional
   */
  async sendMessage(channel: string, msg: string, receiver?: string) {
    const data: SendDataCommunication = {
      msg: msg,
      channel: channel,
      ...(receiver && { receiver }),
    };
    if (receiver) {
      const receiverPeerId = await createFromJSON({ id: `${receiver}` });
      this.pushMessageToMessageQueue(receiverPeerId, data);
    } else {
      // send message for listener peers (not relays)
      const peers = this._node!.getPeers().filter(
        (peer) => !CommunicationConfig.relays.peerIDs.includes(peer.toString())
      );
      for (const peer of peers) {
        this.pushMessageToMessageQueue(peer, data);
      }
    }
  }

  /**
   * store dialers' peerID to PeerStore and dials them
   * @param peers id of peers
   */
  addAndDialPeer = async (peers: string[]) => {
    if (this._node) {
      for (const peer of peers) {
        try {
          for (const addr of CommunicationConfig.relays.multiaddrs) {
            const multi = multiaddr.multiaddr(
              addr.concat(`/p2p-circuit/p2p/${peer}`)
            );
            if (!this.getPeerIds().includes(peer)) {
              this._pendingDialPeers.push(peer);
              this._node?.peerStore.addressBook
                .set(await createFromJSON({ id: `${peer}` }), [multi])
                .catch((err) => {
                  logger.warn(err);
                });
              try {
                await this._node?.dialProtocol(
                  multi,
                  this._SUPPORTED_PROTOCOL.get('MSG')!
                );
                this._disconnectedPeers.delete(peer);
                logger.info(`a peer with peerID [${peer}] added`);
              } catch (err) {
                logger.warn(
                  `An error occurred while dialing peer ${peer}: `,
                  err
                );
              } finally {
                this._pendingDialPeers = this._pendingDialPeers.filter(
                  (innerPeer) => innerPeer !== peer
                );
              }
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
  private getOpenStreamAndConnection = async (
    node: Libp2p,
    peer: PeerId,
    protocol: string
  ): Promise<ConnectionStream> => {
    let connection: Connection | undefined = undefined;
    let stream: Stream | undefined = undefined;

    for (const conn of node.getConnections(peer)) {
      if (conn.stat.status === OPEN) {
        for (const obj of conn.streams) {
          if (
            obj.stat.protocol === protocol &&
            obj.stat.direction === 'outbound'
          ) {
            stream = obj;
            break;
          }
        }
        if (stream) {
          connection = conn;
          break;
        }
      }
    }

    if (!connection) {
      if (this._pendingDialPeers.includes(peer.toString())) {
        throw new Error(
          'The dial to target peer is still pending, the sending will be retried soon.'
        );
      }
      connection = await node.dial(peer);
    }
    if (!stream) {
      stream = await connection.newStream([protocol]);
    }
    return {
      stream: stream,
      connection: connection,
    };
  };

  /**
   * Pushes a message to the message queue
   * @param peer
   * @param messageToSend
   */
  private pushMessageToMessageQueue = (
    peer: PeerId,
    messageToSend: SendDataCommunication
  ) => {
    this._messageQueue.push(
      this.objectToUint8Array({ peer, messageToSend, retriesCount: 0 })
    );
  };

  /**
   * handle incoming messages with broadcast protocol
   * @param stream
   * @param connection
   */
  private handleBroadcast = async (stream: Stream, connection: Connection) => {
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
            const receivedData: ReceiveDataCommunication = JsonBI.parse(
              msg.toString()
            );

            const runSubscribeCallback = async (channel: SubscribeChannel) => {
              this.hasUrl(channel)
                ? channel.func(
                    receivedData.msg,
                    receivedData.channel,
                    connection.remotePeer.toString(),
                    channel.url
                  )
                : channel.func(
                    receivedData.msg,
                    receivedData.channel,
                    connection.remotePeer.toString()
                  );
            };
            if (this._subscribedChannels[receivedData.channel]) {
              logger.info(
                `Received a message from [${connection.remotePeer.toString()}] in a subscribed channel [${
                  receivedData.channel
                }]`
              );
              logger.debug(`Received msg with data [${receivedData.msg}]`);
              this._subscribedChannels[receivedData.channel].forEach(
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
   * @deprecated since the issues of the guards causing message losses are fixed
   */
  private handlePeerDiscovery = async (
    node: Libp2p,
    stream: Stream,
    connection: Connection
  ) => {
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
              const receivedData: ReceivePeers = JsonBI.parse(msg.toString());
              const nodePeerIds = node
                .getPeers()
                .map((peer) => peer.toString());
              await this.addAndDialPeer(
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
  private startDialer = async () => {
    try {
      const peerId = await Dialer.getOrCreatePeerID();
      const node = await createLibp2p({
        // get or create new PeerID if it doesn't exist
        peerId: peerId.peerId,
        // Type of communication
        transports: [webSockets()],
        // Enable module encryption message
        connectionEncryption: [noise()],
        streamMuxers: [
          // mplex is a Stream Multiplexer protocol
          mplex(),
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
        pubsub: gossipsub({ allowPublishToZeroPeers: true }),
        peerDiscovery: [
          bootstrap({
            timeout: CommunicationConfig.bootstrapTimeout * 1000,
            list: CommunicationConfig.relays.multiaddrs,
          }),
          pubsubPeerDiscovery({
            interval: CommunicationConfig.pubsubInterval * 1000,
          }) as PeerDiscovery,
        ],
      });

      // Listen for peers disconnecting
      node.connectionManager.addEventListener('peer:disconnect', (evt) => {
        logger.info(`Peer [${evt.detail.remotePeer.toString()}] Disconnected!`);
        this._disconnectedPeers.add(evt.detail.remotePeer.toString());
        this._pendingDialPeers = this._pendingDialPeers.filter(
          (peer) => peer !== evt.detail.remotePeer.toString()
        );
      });

      // Listen for new peers
      node.addEventListener('peer:discovery', async (evt) => {
        logger.info(`Found peer ${evt.detail.id.toString()}`);
        // dial them when we discover them
        if (
          !CommunicationConfig.relays.peerIDs.includes(
            evt.detail.id.toString()
          ) &&
          !this._pendingDialPeers.includes(evt.detail.id.toString())
        ) {
          this.addAndDialPeer([evt.detail.id.toString()]).catch((err) => {
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

      /**
       * TODO: This is probably no longer needed and should be removed in the near
       * future if default peer discovery mechanism works as expected
       */
      // Handle messages for the _SUPPORTED_PROTOCOL_PEERS
      await node.handle(
        this._SUPPORTED_PROTOCOL.get('PEER')!,
        async ({ stream, connection }) => {
          // Read the stream
          this.handlePeerDiscovery(node, stream, connection);
        }
      );

      await node.start();
      logger.info(`Dialer node started with peerId: ${node.peerId.toString()}`);

      this._node = node;

      // this should call after createRelayConnection duo to peerId should save after create relay connection
      await Dialer.savePeerIdIfNeeded(peerId);

      // Job for log all peers
      setInterval(() => {
        logger.info(`peers are [${this.getPeerIds()}]`);
      }, CommunicationConfig.getPeersInterval * 1000);

      // // Job for connect to disconnected peers
      setInterval(() => {
        this.addAndDialPeer(Array.from(this._disconnectedPeers));
      }, CommunicationConfig.connectToDisconnectedPeersInterval * 1000);
    } catch (e) {
      logger.error(`An error occurred for start dialer: ${e}`);
    }
  };

  /**
   * Converts a Unit8Array to an object
   * @param uint8Array
   */
  private uint8ArrayToObject = (uint8Array: Uint8Array) =>
    JsonBI.parse(uint8ArrayToString(uint8Array));

  /**
   * Converts an object to Uint8Array
   * @param object
   */
  private objectToUint8Array = (object: any) =>
    uint8ArrayFromString(JsonBI.stringify(object));

  /**
   * Processes message queue stream and pipes messages to a correct remote pipe
   */
  private processMessageQueue = async () => {
    interface MessageQueueParsedMessage {
      peer: string;
      messageToSend: SendDataCommunication;
      retriesCount: bigint;
    }

    const routesInfo: Record<
      string,
      {
        source: Pushable<Uint8Array>;
        stream: Stream;
      }
    > = {};
    /**
     * Returns the source piped to the provided stream
     * @param stream
     * @param peer
     * @returns The source which is piped to the stream
     */
    const getStreamSource = (stream: Stream, peer: string) => {
      if (routesInfo[peer]?.stream === stream) {
        return routesInfo[peer].source;
      } else {
        routesInfo[peer] = {
          source: pushable(),
          stream: stream,
        };
        const source = routesInfo[peer].source;
        pipe(source, lp.encode(), stream.sink);
        return source;
      }
    };

    /**
     * Retries sending message by pushing it to the queue again
     * @param message
     */
    const retrySendingMessage = (message: Uint8Array) => {
      const { retriesCount, ...rest }: MessageQueueParsedMessage =
        this.uint8ArrayToObject(message);

      const newRetriesCount = retriesCount + 1n;

      if (newRetriesCount <= MESSAGE_SENDING_RETRIES_MAX_COUNT) {
        const timeout =
          1000 *
          MESSAGE_SENDING_RETRIES_EXPONENTIAL_FACTOR ** Number(newRetriesCount);

        setTimeout(() => {
          logger.warn(
            `Retry #${retriesCount} for sending message ${JsonBI.stringify(
              rest.messageToSend
            )}...`
          );

          this._messageQueue.push(
            this.objectToUint8Array({
              ...rest,
              retriesCount: newRetriesCount,
            })
          );
        }, timeout);
      } else {
        logger.warn(
          `Failed to send message ${JsonBI.stringify(
            rest.messageToSend
          )} after ${MESSAGE_SENDING_RETRIES_MAX_COUNT} retries`
        );
      }
    };

    for await (const message of this._messageQueue) {
      try {
        const { peer, messageToSend, retriesCount }: MessageQueueParsedMessage =
          this.uint8ArrayToObject(message);

        const connStream = await this.getOpenStreamAndConnection(
          this._node!,
          await createFromJSON({ id: `${peer}` }),
          this._SUPPORTED_PROTOCOL.get('MSG')!
        );

        try {
          const source = getStreamSource(connStream.stream, peer);

          source.push(this.objectToUint8Array(messageToSend));

          if (retriesCount) {
            logger.warn(
              `Retry #${retriesCount} was successful for message ${JsonBI.stringify(
                messageToSend
              )}`
            );
          }
        } catch (error) {
          logger.error(
            'An error occurred while trying to get stream source',
            error
          );
        }
      } catch (error) {
        logger.warn(
          'An error occurred while trying to process a message in the messages queue',
          error
        );
        retrySendingMessage(message);
      }
    }
  };
}

export default Dialer;
