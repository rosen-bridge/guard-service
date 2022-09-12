import { createLibp2p, Libp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Bootstrap } from '@libp2p/bootstrap'
import { PubSubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { FloodSub } from '@libp2p/floodsub'
import CommunicationConfig from "./CommunicationConfig";
import { JsonBI } from "../network/NetworkModels"
import { Connection, Stream } from "@libp2p/interface-connection";
import { OPEN } from "@libp2p/interface-connection/status";
import * as lp from "it-length-prefixed";

import {
    ConnectionStream,
    ReceiveDataCommunication,
    SendDataCommunication,
    SubscribeChannel,
    SubscribeChannelFunction, SubscribeChannels
} from "./Interfaces";
import { PeerId } from "@libp2p/interface-peer-id";
import { createEd25519PeerId, createFromJSON } from "@libp2p/peer-id-factory";
import fs from "fs";
import { PassThrough } from "stream";


// TODO: Need to write test for This package
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/21
class Dialer {
    private static instance: Dialer;

    private _NODE: Libp2p | undefined;
    private _SUBSCRIBED_CHANNELS: SubscribeChannels = {};
    private _PENDING_MESSAGE: SendDataCommunication[] = [];
    private _OUTPUT_STREAMS: Map<string, PassThrough> = new Map<string, PassThrough>()
    private readonly _SUPPORTED_PROTOCOL: string = "/broadcast"

    private constructor() {
        console.log("Create Dialer Instance!")
    }

    /**
     * @return a Dialer instance (create if it doesn't exist)
     */
    public static getInstance = async (): Promise<Dialer> => {
        if (!Dialer.instance) {
            Dialer.instance = new Dialer();
            await Dialer.instance.startDialer()
        }
        return Dialer.instance;
    }

    /**
     * return PeerID or create PeerID if it doesn't exist
     * @return PeerID
     */
    static getOrCreatePeerID = async (): Promise<{ peerId: PeerId; exist: boolean }> => {
        if (!fs.existsSync(CommunicationConfig.peerIdFilePath)) {
            return {
                peerId: await createEd25519PeerId(),
                exist: false
            } as const
        } else {
            const jsonData: string = fs.readFileSync(CommunicationConfig.peerIdFilePath, 'utf8')
            const peerIdDialerJson = await JSON.parse(jsonData)
            return {
                peerId: await createFromJSON(peerIdDialerJson),
                exist: true
            }
        }
    }

    /**
     * If it didn't exist PeerID file, this function try to create a file and save peerId into that
     * @param peerObj { peerId: PeerId; exist: boolean }
     */
    static savePeerIdIfNeed = async (peerObj: { peerId: PeerId; exist: boolean }): Promise<void> => {
        if (!peerObj.exist) {
            const peerId = peerObj.peerId
            let privateKey: Uint8Array
            let publicKey: Uint8Array
            if (peerId.privateKey && peerId.publicKey) {
                privateKey = peerId.privateKey
                publicKey = peerId.publicKey
            } else throw Error("PrivateKey for p2p is required")

            const peerIdDialerJson = {
                "id": peerId.toString(),
                "privKey": uint8ArrayToString(privateKey, "base64pad"),
                "pubKey": uint8ArrayToString(publicKey, "base64pad"),
            }
            const jsonData = JSON.stringify(peerIdDialerJson)
            fs.writeFile(CommunicationConfig.peerIdFilePath, jsonData, 'utf8', function (err) {
                if (err) throw err;
                console.log('PeerId created!');
            })
        }
    }

    /**
     * @return list of subscribed channels' name
     */
    getSubscribedChannels = (): string[] => {
        return Object.keys(this._SUBSCRIBED_CHANNELS)
    }

    /**
     * @return string of PeerID
     */
    getPeerId = (): string => {
        if (!this._NODE)
            throw Error("Dialer node isn't ready, please try later")
        else
            return this._NODE.peerId.toString()
    }

    /**
     * establish connection to relay
     * @param channel: string desire channel for subscription
     * @param callback: a callback function for subscribed channel
     * @param url: string for apiCallbackFunction
     */
    subscribeChannel = (channel: string, callback: SubscribeChannelFunction, url?: string): void => {
        const callbackObj: SubscribeChannel = {
            func: callback
        }
        if (url) callbackObj.url = url

        if (this._SUBSCRIBED_CHANNELS[channel]) {
            if (this._SUBSCRIBED_CHANNELS[channel].find(
                (sub: SubscribeChannel) =>
                    sub.func.name === callback.name && sub.url === url
            )) {
                console.log("a redundant subscribed channel detected !")
                return
            }
            this._SUBSCRIBED_CHANNELS[channel].push(callbackObj)
        } else {
            this._SUBSCRIBED_CHANNELS[channel] = []
            this._SUBSCRIBED_CHANNELS[channel].push(callbackObj)
        }
    }

    /**
     * send message to specific peer or broadcast it
     * @param channel: String
     * @param msg: string
     * @param receiver optional
     */
    sendMessage = async (channel: string, msg: string, receiver?: string): Promise<void> => {
        const data: SendDataCommunication = {
            "msg": msg,
            "channel": channel
        }
        if (receiver) data.receiver = receiver
        if (!this._NODE) {
            this._PENDING_MESSAGE.push(data)
            console.warn("Message added to pending list due to dialer node isn't ready")
            return
        }

        if (receiver) {
            const receiverPeerId = await createFromJSON({id: `${receiver}`})
            this.streamForPeer(this._NODE, receiverPeerId, data)
        } else {
            // send message for listener peers (not relays)
            const peers = this._NODE.getPeers().filter(peer => peer.toString() ! in CommunicationConfig.relays.peerIDs)
            for (const peer of peers) {
                this.streamForPeer(this._NODE, peer, data)
            }
        }
    }

    /**
     * create or find an open stream for specific peer and protocol
     * @param node
     * @param peer create or find stream for peer
     * @param protocol try to create a stream with this protocol
     */
    private getOpenStream = async (node: Libp2p, peer: PeerId, protocol: string):
        Promise<ConnectionStream> => {
        let connection: Connection | undefined = undefined
        let stream: Stream | undefined = undefined
        for await (const conn of node.getConnections(peer)) {
            if (conn.stat.status === OPEN) {
                for await (const obj of conn.streams) {
                    if (obj.stat.protocol === protocol) {
                        stream = obj
                        break
                    }
                }
                connection = conn
                if (stream) break
                else stream = await conn.newStream([protocol])
            } else await conn.close()
        }
        if (!connection) {
            connection = await node.dial(peer)
            stream = await connection.newStream([protocol])
        }
        if (!stream) stream = await connection.newStream([protocol])
        return {
            stream: stream,
            connection: connection
        }
    }

    /**
     * write data on stream for a peer
     * @param node
     * @param peer
     * @param messageToSend
     */
    private streamForPeer = async (node: Libp2p, peer: PeerId, messageToSend: SendDataCommunication): Promise<void> => {
        let outputStream: PassThrough | undefined

        const connStream = await this.getOpenStream(node, peer, this._SUPPORTED_PROTOCOL)
        const passThroughName = `${peer.toString()}-${this._SUPPORTED_PROTOCOL}-${connStream.stream.id}`

        if (this._OUTPUT_STREAMS.has(passThroughName)) {
            outputStream = this._OUTPUT_STREAMS.get(passThroughName)
        } else {
            const outStream = new PassThrough();
            this._OUTPUT_STREAMS.set(passThroughName, outStream)
            outputStream = outStream
            pipe(
                outputStream,
                lp.encode(),
                connStream.stream
            ).catch(e => {
                console.error(e)
                connStream.stream.close()
                this._OUTPUT_STREAMS.delete(passThroughName)
                this._PENDING_MESSAGE.push(messageToSend)
                console.warn("Message added to pending list due to dialer node isn't ready")
            });
        }

        if (outputStream) {
            // Give time for the stream to flush.
            await new Promise(resolve => setTimeout(resolve, CommunicationConfig.timeToFlushStream * 1000));
            // Send some outgoing data.
            outputStream.write(JsonBI.stringify(messageToSend));
        } else {
            console.error(`doesn't exist output pass through for ${passThroughName}`)
        }
    }

    /**
     *
     * config a dialer node with peerDiscovery
     * @return a Libp2p object after start node
     */
    private startDialer = async (): Promise<void> => {
        const peerId = await Dialer.getOrCreatePeerID()
        const node = await createLibp2p({
            // get or create new PeerID if it doesn't exist
            peerId: peerId.peerId,
            // Type of communication
            transports: [
                new WebSockets()
            ],
            // Enable module encryption message
            connectionEncryption: [
                new Noise()
            ],
            streamMuxers: [         // Mplex is a Stream Multiplexer protocol
                new Mplex()
            ],
            relay: {                // Circuit Relay options (this config is part of libp2p core configurations)
                enabled: true       // Allows you to dial and accept relayed connections.
            },
            connectionManager: {
                autoDial: true      // Auto connect to discovered peers (limited by ConnectionManager minConnections)
                // The `tag` property will be searched when creating the instance of your Peer Discovery service.
                // The associated object, will be passed to the service when it is instantiated.
            },
            pubsub: new FloodSub(), // Active peer discovery and bootstrap peers
            peerDiscovery: [
                new Bootstrap({
                    interval: CommunicationConfig.bootstrapInterval * 1000,
                    list: CommunicationConfig.relays.multiaddrs
                }),
                new PubSubPeerDiscovery({
                    interval: CommunicationConfig.pubsubInterval * 1000
                })
            ]
        })

        // Define protocol for node
        await node.handle(
            this._SUPPORTED_PROTOCOL,
            ({stream, connection}) => pipe(
                stream.source,
                async () => {
                    let receivedDataObj = ""
                    // For each chunk of data
                    for await (const data of stream.source) {
                        receivedDataObj = uint8ArrayToString(data.subarray())
                    }
                    const receivedData: ReceiveDataCommunication = await JsonBI.parse(receivedDataObj)

                    const runSubscribeCallback = async (value: any): Promise<void> => {
                        value.url ?
                            value.func(receivedData.msg, receivedData.channel, connection.remotePeer.toString(), value.url) :
                            value.func(receivedData.msg, receivedData.channel, connection.remotePeer.toString())
                    }
                    if (this._SUBSCRIBED_CHANNELS[receivedData.channel]) {
                        console.log(`a message received in subscribed channel ${receivedData.channel} from ${connection.remotePeer.toString()}`)
                        this._SUBSCRIBED_CHANNELS[receivedData.channel].forEach(runSubscribeCallback)
                    } else console.warn(`received a message from ${connection.remotePeer.toString()} in a unsubscribed channel ${receivedData.channel}`)
                }
            )
        )

        node.start()
        console.log(`Dialer node started with id ${node.peerId.toString()}`)

        this._NODE = await node

        // this should call after createRelayConnection duo to peerId should save after create relay connection
        await Dialer.savePeerIdIfNeed(peerId)

        new Promise(() => setInterval(this.sendPendingMessage, CommunicationConfig.sendPendingMessage * 1000));
    }

    sendPendingMessage = async (): Promise<void> => {
        const resendMessage = async (value: SendDataCommunication): Promise<void> => {
            await value.receiver ?
                await this.sendMessage(value.channel, value.msg, value.receiver) :
                await this.sendMessage(value.channel, value.msg)
        }

        if (this._PENDING_MESSAGE.length > 0) {
            await this._PENDING_MESSAGE.forEach(await resendMessage)
        }
    }

}

export default Dialer
