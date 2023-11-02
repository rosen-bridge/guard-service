import fs from 'fs';
import * as lp from 'it-length-prefixed';
import map from 'it-map';
import { pipe } from 'it-pipe';
import { pushable, Pushable } from 'it-pushable';
import { createLibp2p, Libp2p } from 'libp2p';
import {
  fromString as uint8ArrayFromString,
  toString as uint8ArrayToString,
} from 'uint8arrays';

import { groupBy, negate } from 'lodash-es';

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
import { JsonBI } from '../network/NetworkModels';
import { NotStartedDialerNodeError } from '../utils/errors';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

// TODO: Need to write test for This package
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/21
class Dialer {
  private static instance: Dialer;

  private _messageQueue = pushable();
  private _node: Libp2p | undefined;
  private _subscribedChannels: SubscribeChannels = {};

  private readonly _SUPPORTED_PROTOCOL = new Map<string, string>([
    ['MSG', '/broadcast'],
    ['PEER', '/getpeers'],
  ]);

  private constructor() {
    logger.info('Dialer constructor called.');
  }

  /**
   * @return a Dialer instance (create if it doesn't exist)
   */
  public static getInstance = async () => {
    if (!Dialer.instance) {
      logger.debug("Dialer instance didn't exist, creating a new one.");
      Dialer.instance = new Dialer();
      await Dialer.instance.startDialer();
      logger.debug('Dialer instance started.');
      Dialer.instance.processMessageQueue();
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
      const peerIdFilePath = CommunicationConfig.peerIdFilePath;
      if (!fs.existsSync(peerIdFilePath)) {
        logger.debug("peerId file didn't exist, generating a new peerId.", {
          peerIdFilePath,
        });
        return {
          peerId: await createEd25519PeerId(),
          exist: false,
        } as const;
      } else {
        logger.debug(
          'peerId file exists, reading and returning the contents of the file as peerId.',
          {
            peerIdFilePath,
          }
        );
        const jsonData = fs.readFileSync(peerIdFilePath, 'utf8');
        const peerIdDialerJson: Parameters<typeof createFromJSON>['0'] =
          JSON.parse(jsonData);
        logger.debug('PeerId file read and parsed successfully.');
        return {
          peerId: await createFromJSON(peerIdDialerJson),
          exist: true,
        };
      }
    } catch (error) {
      throw new Error(`Couldn't get or create a PeerID: ${error}`);
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
        function (error) {
          if (error) {
            logger.warn(
              `An error occurred while writing created PeerId to the file.`
            );
            logger.warn(error.stack);
            throw error;
          }
          logger.info('PeerId file created.');
        }
      );
    } else {
      logger.debug('PeerId exists, ignored saving to file.', { peerObj });
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
      throw new NotStartedDialerNodeError();
    }
    return this._node.peerId.toString();
  };

  /**
   * @return string of PeerID
   */
  getPeerIds = () => {
    if (!this._node) {
      throw new NotStartedDialerNodeError();
    }
    return this._node.getPeers().map((peer) => peer.toString());
  };

  /**
   * @return discovered peers count in the address book
   */
  getDiscoveredPeersCount = async () => {
    if (!this._node) {
      throw new NotStartedDialerNodeError();
    }
    return (await this._node.peerStore.all()).length;
  };

  /**
   * @returns connected peers count
   */
  getConnectedPeersCount = () => {
    return this.getPeerIds().length;
  };

  /**
   * @returns relay states grouped by the connection status
   */
  getRelayStates = () => {
    const connectedPeers = this.getPeerIds();
    const relayStates = groupBy(CommunicationConfig.relays.peerIDs, (peer) =>
      connectedPeers.includes(peer) ? 'connected' : 'notConnected'
    );
    return relayStates;
  };

  /**
   * Checks if a peer belongs to a relay
   *
   * @param peer
   */
  isRelay = (peer: string) => CommunicationConfig.relays.peerIDs.includes(peer);

  /**
   * Checks if a peer belongs to a listener (and not a relay)
   *
   * @param peer
   */
  isListener = negate(this.isRelay);

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
        logger.info('A redundant subscribed channel detected.', {
          channel,
          url,
        });
        return;
      }
      this._subscribedChannels[channel].push(callbackObj);
      logger.info(`Channel [${channel}] subscribed.`, {
        url,
      });
    } else {
      this._subscribedChannels[channel] = [];
      this._subscribedChannels[channel].push(callbackObj);
      logger.info(`Channel [${channel}] subscribed.`, {
        url,
      });
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
      logger.debug('Message pushed to the message queue.', { data });
    } else {
      // send message for listener peers (not relays)
      const peers = this._node!.getPeers().filter((peer) =>
        this.isListener(peer.toString())
      );
      for (const peer of peers) {
        this.pushMessageToMessageQueue(peer, data);
        logger.debug('Message pushed to the message queue.', { data, peer });
      }
    }
  }

  /**
   * Creates a `PeerId` object from a string
   * @param id peer id string
   */
  private createFromString = (id: string) => createFromJSON({ id });

  /**
   * Adds an array of peers to address book. Because `autoDial` is enabled, it
   * causes those peers to be dialed, too.
   * @param peers id of peers
   */
  addPeersToAddressBook = async (peers: string[]) => {
    if (this._node) {
      for (const peer of peers) {
        for (const addr of CommunicationConfig.relays.multiaddrs) {
          try {
            const multi = multiaddr.multiaddr(
              addr.concat(`/p2p-circuit/p2p/${peer}`)
            );
            if (!this.getPeerIds().includes(peer)) {
              await this._node.peerStore.addressBook.add(
                await this.createFromString(peer),
                [multi]
              );
              logger.debug(`Peer [${peer}] added to the address book.`);
            }
          } catch (error) {
            logger.error(
              `An error occurred while trying to add peer to address book: ${error}`,
              { peer }
            );
            logger.error(error.stack);
          }
        }
      }
    }
  };

  /**
   * Removes a peer from the address book.
   * @param peer id of peer
   */
  removePeerFromAddressBook = async (peer: string) => {
    if (this._node) {
      try {
        await this._node.peerStore.addressBook.delete(
          await this.createFromString(peer)
        );
        logger.debug(`Peer [${peer}] removed from the address book.`);
      } catch (error) {
        logger.warn(
          `An error occurred while removing peer from address book: ${error}`,
          { peer }
        );
        logger.warn(error.stack);
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

    const peerString = peer.toString();

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
          logger.debug(
            `Found an existing connection and a stream with protocol [${protocol}] to peer [${peerString}].`,
            { conn, stream }
          );
          break;
        }
      }
    }

    if (!connection) {
      logger.debug(
        `Found no connection to peer [${peerString}], trying to dial...`
      );
      connection = await node.dial(peer);
      logger.debug(`Peer [${peerString}] dialed successfully.`, {
        connection,
      });
    }
    if (!stream) {
      logger.debug(
        `Found no stream with protocol [${protocol}] to peer [${peerString}], trying to create a new one...`
      );
      stream = await connection.newStream([protocol]);
      logger.debug(
        `A new stream with protocol [${protocol}] to peer [${peerString}] created successfully.`,
        { stream }
      );
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
          const broadcastProtocol = this._SUPPORTED_PROTOCOL.get('MSG');
          logger.debug(
            `A new message with [${broadcastProtocol}] protocol received from peer [${connection.remotePeer.toString()}], trying to parse...`
          );
          // For each chunk of data
          for await (const msg of source) {
            const receivedData: ReceiveDataCommunication = JsonBI.parse(
              msg.toString()
            );

            logger.debug(
              `The new message with [${broadcastProtocol}] parsed successfully.`,
              {
                message: receivedData,
                subscribedChannels: this._subscribedChannels,
                fromPeer: connection.remotePeer.toString(),
              }
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
              logger.debug(
                `Received a message from [${connection.remotePeer.toString()}] in subscribed channel [${
                  receivedData.channel
                }].`
              );
              this._subscribedChannels[receivedData.channel].forEach(
                runSubscribeCallback
              );
            } else {
              logger.debug(
                `Received a message from [${connection.remotePeer.toString()}] in unsubscribed channel [${
                  receivedData.channel
                }].`
              );
            }
          }
        } catch (error) {
          logger.error(
            `An error occurred while handling stream callback: ${error}`
          );
          logger.error(error.stack);
        }
      }
    ).catch((error) => {
      logger.error(
        `An error occurred while handling broadcast protocol stream: ${error}`
      );
      logger.error(error.stack);
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
            if (this.isRelay(connection.remotePeer.toString())) {
              const receivedData: ReceivePeers = JsonBI.parse(msg.toString());
              const nodePeerIds = node
                .getPeers()
                .map((peer) => peer.toString());
              await this.addPeersToAddressBook(
                receivedData.peerIds.filter(
                  (mainPeer) => !nodePeerIds.includes(mainPeer)
                )
              );
            }
          }
        } catch (error) {
          logger.error(
            `An error occurred while handling stream callback: ${error}`
          );
          logger.error(error.stack);
        }
      }
    ).catch((error) => {
      logger.error(
        `An error occurred while handling get peers protocol stream: ${error}`
      );
      logger.error(error.stack);
    });
  };

  /**
   * Runs a callback in an interval to log some info
   * @param callback
   */
  private startLoggingInterval = (callback: () => void) => {
    setInterval(callback, CommunicationConfig.loggingInterval * 1000);
  };

  /**
   * Tries to re-connect to a disconnected relay. If the relay is connected, the
   * corresponding interval is cleared and connection manager event listener is
   * removed.
   *
   * @param peer peer of recently disconnected peer
   */
  private tryReconnectingRelay = (peer: string) => {
    logger.debug(`Trying to re-connect relay ${peer}...`);

    const interval = setInterval(async () => {
      const multiaddrIndex = CommunicationConfig.relays.peerIDs.findIndex(
        (id) => id === peer
      );
      logger.debug(`Trying to add relay to address book...`, { peer });
      try {
        await this._node?.peerStore.addressBook.add(
          await this.createFromString(peer),
          [
            multiaddr.multiaddr(
              CommunicationConfig.relays.multiaddrs[multiaddrIndex]
            ),
          ]
        );
        logger.debug(`Relay added to address book successfully.`, { peer });
      } catch (error) {
        logger.warn(
          `An error occurred while trying to add relay [${peer}] to address book: ${error}`
        );
        logger.warn(error.stack);
      }
    }, CommunicationConfig.relayReconnectionInterval * 1000);

    const controller = new AbortController();

    this._node?.connectionManager.addEventListener(
      'peer:connect',
      async (evt) => {
        const connectedPeer = evt.detail.remotePeer.toString();

        if (connectedPeer === peer) {
          logger.info(`Relay ${peer} re-connected successfully.`);
          clearInterval(interval);
          logger.debug('Relay re-connection interval cleared.', { peer });
          controller.abort();
          logger.debug('Relay re-connection event listener removed.', { peer });
        }
      },
      { signal: controller.signal }
    );
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
          autoRelay: {
            enabled: true,
          },
        },
        connectionManager: {
          minConnections: CommunicationConfig.guardsCount + 10, // We add 10 to handle relays and other possible connections
        },
        pubsub: gossipsub({ allowPublishToZeroPeers: true }),
        peerDiscovery: [
          bootstrap({
            timeout: CommunicationConfig.bootstrapTimeout * 1000,
            list: CommunicationConfig.relays.multiaddrs,
          }),
          pubsubPeerDiscovery({
            interval: CommunicationConfig.pubsubInterval * 1000,
          }),
        ],
      });

      logger.debug('libp2p instance created.');

      // Listen for peers disconnecting
      node.connectionManager.addEventListener(
        'peer:disconnect',
        async (evt) => {
          const peer = evt.detail.remotePeer.toString();

          this.removePeerFromAddressBook(peer);

          if (this.isRelay(peer)) {
            logger.warn(`Relay [${peer}] disconnected.`);
            this.tryReconnectingRelay(peer);
          } else {
            logger.info(`Peer [${peer}] disconnected.`);
          }
        }
      );

      // Listen for new peers
      node.addEventListener('peer:discovery', async (evt) => {
        if (this.isListener(evt.detail.id.toString())) {
          logger.debug(`Found peer [${evt.detail.id.toString()}].`);
          this.addPeersToAddressBook([evt.detail.id.toString()]).catch(
            (error) => {
              logger.error(
                `An error occurred while dialing peer [${evt.detail.id}].`
              );
              logger.error(error.stack);
            }
          );
        }
      });

      // Define protocol for node
      await node.handle(
        this._SUPPORTED_PROTOCOL.get('MSG')!,
        async ({ stream, connection }) => {
          // Read the stream
          this.handleBroadcast(stream, connection);
        },
        {
          maxInboundStreams:
            CommunicationConfig.guardsCount *
            CommunicationConfig.allowedStreamsPerGuard,
          maxOutboundStreams:
            CommunicationConfig.guardsCount *
            CommunicationConfig.allowedStreamsPerGuard,
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
      logger.info(
        `Dialer node started with peerId: ${node.peerId.toString()}.`
      );

      this._node = node;

      // this should call after createRelayConnection duo to peerId should save after create relay connection
      await Dialer.savePeerIdIfNeeded(peerId);

      /**
       * TODO: This is not the ideal way to increase the streams limits, but there
       * seems to be no other way to do it with current libp2p apis. It needs to
       * be changed if such an api is added in the future.
       *
       * Related issues:
       * - https://github.com/libp2p/js-libp2p/issues/1518
       * - https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/99
       */
      const handler = node.registrar.getHandler('/libp2p/circuit/relay/0.1.0');
      node.registrar.unhandle('/libp2p/circuit/relay/0.1.0');
      await node.registrar.handle(
        '/libp2p/circuit/relay/0.1.0',
        handler.handler,
        {
          ...handler.options,
          maxInboundStreams:
            CommunicationConfig.guardsCount *
            CommunicationConfig.allowedStreamsPerGuard,
          maxOutboundStreams:
            CommunicationConfig.guardsCount *
            CommunicationConfig.allowedStreamsPerGuard,
        }
      );

      // Log peers discovery and connection state
      this.startLoggingInterval(async () => {
        const requiredPeersCount =
          CommunicationConfig.guardsCount -
          1 +
          CommunicationConfig.relays.peerIDs.length;
        const discoveredPeersCount = await this.getDiscoveredPeersCount();
        const connectedPeersCount = this.getConnectedPeersCount();
        const remainingRequiredDiscoveries =
          requiredPeersCount - discoveredPeersCount;
        const remainingRequiredConnections =
          requiredPeersCount - connectedPeersCount;
        logger.info(
          `[${discoveredPeersCount}] peers are discovered. Required discoveries remaining: ${remainingRequiredDiscoveries}`
        );
        logger.info(
          `[${connectedPeersCount}] out of [${discoveredPeersCount}] discovered peers are connected. Required connections remaining: ${remainingRequiredConnections}`
        );
        logger.debug(`Connected peers are: [${this.getPeerIds()}].`);
      });

      // Log relays connection state
      this.startLoggingInterval(() => {
        const relayStates = this.getRelayStates();
        logger.debug('Relays connection states: ', { relayStates });

        if (relayStates.notConnected?.length) {
          if (relayStates.connected?.length) {
            logger.warn(
              `[${relayStates.notConnected.length}] out of [${CommunicationConfig.relays.peerIDs.length}] relays are not connected.`
            );
          } else {
            logger.error(
              `None of [${CommunicationConfig.relays.peerIDs.length}] relays are connected. The service won't work properly until at least one relay is connected.`
            );
          }
        }
      });
    } catch (error) {
      logger.error(`An error occurred while starting dialer.`);
      logger.error(error.stack);
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

      if (
        newRetriesCount <= CommunicationConfig.messageSendingRetriesMaxCount
      ) {
        const timeout =
          1000 *
          CommunicationConfig.messageSendingRetriesExponentialFactor **
            Number(newRetriesCount);

        setTimeout(() => {
          logger.info(`Retry #${retriesCount} for sending a failed message...`);
          logger.debug(`Message content is: `, {
            messageToSend: rest.messageToSend,
          });

          this._messageQueue.push(
            this.objectToUint8Array({
              ...rest,
              retriesCount: newRetriesCount,
            })
          );
        }, timeout);
      } else {
        logger.error(
          `Failed to send a message after ${CommunicationConfig.messageSendingRetriesMaxCount} retries, message dropped.`
        );
        logger.debug(`Message content was: `, {
          messageToSend: rest.messageToSend,
        });
      }
    };

    for await (const message of this._messageQueue) {
      try {
        const { peer, messageToSend, retriesCount }: MessageQueueParsedMessage =
          this.uint8ArrayToObject(message);

        const connStream = await this.getOpenStreamAndConnection(
          this._node!,
          await this.createFromString(peer),
          this._SUPPORTED_PROTOCOL.get('MSG')!
        );

        try {
          const source = getStreamSource(connStream.stream, peer);

          source.push(this.objectToUint8Array(messageToSend));

          if (retriesCount) {
            logger.info(`Retry #${retriesCount} was successful for a message.`);
            logger.debug(`Message was: `, { messageToSend });
          }
        } catch (error) {
          logger.error(
            `An error occurred while trying to get stream source: ${error}`
          );
        }
      } catch (error) {
        logger.error(
          `An error occurred while trying to process a message in the messages queue`
        );
        logger.error(error.stack);
        retrySendingMessage(message);
      }
    }
  };
}

export default Dialer;
