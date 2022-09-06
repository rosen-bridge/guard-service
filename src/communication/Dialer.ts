import { createLibp2p, Libp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { Bootstrap } from '@libp2p/bootstrap'
import { PubSubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { FloodSub } from '@libp2p/floodsub'
import { Multiaddr } from '@multiformats/multiaddr'
import CommunicationConfig from "./CommunicationConfig";
import { JsonBI } from "../network/NetworkModels"
import { Connection } from "@libp2p/interfaces/src/connection";
import {
    ReceiveDataCommunication,
    SendDataCommunication,
    SubscribeChannel,
    SubscribeChannelFunction, SubscribeChannels
} from "./Interfaces";
import { PeerId } from "@libp2p/interface-peer-id";
import { createEd25519PeerId, createFromJSON } from "@libp2p/peer-id-factory";
import fs from "fs";


// TODO: Need to write test for This package
//  https://git.ergopool.io/ergo/rosen-bridge/ts-guard-service/-/issues/21
class Dialer {
    private static instance: Dialer;

    private _NODE: Libp2p | undefined;
    private _RELAY_CONN: Connection | undefined;
    private _SUBSCRIBED_CHANNELS: SubscribeChannels = {};
    private _PENDING_MESSAGE: SendDataCommunication[] = [];

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
     * @return list of subscribed channels' name
     */
    getSubscribedChannels = (): string[] => {
        return Object.keys(this._SUBSCRIBED_CHANNELS)
    }

    /**
     * @return string of PeerID
     */
    getPeerId = (): string => {
        if(!this._NODE)
            throw Error("Dialer node isn't ready, please try later")
        else
            return this._NODE.peerId.toString()
    }

    /**
     * return PeerID or create PeerID if it doesn't exist
     * @return PeerID
     */
    static getOrCreatePeerID = async (): Promise<{ peerId: PeerId; exist: boolean }> => {
        if (!fs.existsSync(CommunicationConfig.peerIdFilePath)){
            return {
                peerId: await createEd25519PeerId(),
                exist: false
            } as const
        }
        else {
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
        if (!peerObj.exist){
            const peerId = peerObj.peerId
            let privateKey: Uint8Array
            let publicKey: Uint8Array
            if (peerId.privateKey && peerId.publicKey) {
                privateKey = peerId.privateKey
                publicKey = peerId.publicKey
            }
            else throw Error("PrivateKey for p2p is required")

            const peerIdDialerJson =  {
                "id": peerId.toString(),
                "privKey": uint8ArrayToString(privateKey, "base64pad"),
                "pubKey": uint8ArrayToString(publicKey, "base64pad"),
            }
            const jsonData = JSON.stringify(peerIdDialerJson)
            fs.writeFile(CommunicationConfig.peerIdFilePath, jsonData, 'utf8', function(err) {
                if (err) throw err;
                console.log('PeerId created!');
            })
        }
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

        if (this._SUBSCRIBED_CHANNELS[channel]){
            if (this._SUBSCRIBED_CHANNELS[channel].find(
                (sub: SubscribeChannel) =>
                    sub.func.name === callback.name && sub.url === url
            )) {
                console.log("a redundant subscribed channel detected !")
                return
            }
            this._SUBSCRIBED_CHANNELS[channel].push(callbackObj)
        }
        else {
            this._SUBSCRIBED_CHANNELS[channel] = []
            this._SUBSCRIBED_CHANNELS[channel].push(callbackObj)
        }
    }

    /**
     * establish connection to relay
     * @param node: Libp2p
     */
    private createRelayConnection = async (node: Libp2p): Promise<void> => {
        if (!this._RELAY_CONN) {
            const remoteAddr: Multiaddr = await new Multiaddr(CommunicationConfig.relay)
            const conn = await node.dial(remoteAddr)
            console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
            this._RELAY_CONN = conn
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
            // Mplex is a Stream Multiplexer protocol
            streamMuxers: [
                new Mplex()
            ],
            // Active peer discovery and bootstrap peers
            pubsub: new FloodSub(),
            peerDiscovery: [
                new Bootstrap({
                    interval: CommunicationConfig.bootstrapInterval * 1000,
                    list: [CommunicationConfig.relay]
                }),
                new PubSubPeerDiscovery({
                    interval: CommunicationConfig.pubsubInterval * 1000
                })
            ]
        })

        // Define protocol for node
        await node.handle('/broadcast', ({stream}) => pipe(
            stream.source,
            async () => {
                let receivedDataObj = ""
                // For each chunk of data
                for await (const data of stream.source) {
                    receivedDataObj = uint8ArrayToString(data)
                }
                const receivedData: ReceiveDataCommunication = await JsonBI.parse(receivedDataObj)

                const runSubscribeCallback = async (value: any): Promise<void> => {
                    value.url ?
                        value.func(receivedData.msg, receivedData.channel, receivedData.sender, value.url) :
                        value.func(receivedData.msg, receivedData.channel, receivedData.sender)
                }
                if (this._SUBSCRIBED_CHANNELS[receivedData.channel]) {
                    console.log(`a message received in subscribed channel ${receivedData.channel} from ${receivedData.sender}`)
                    this._SUBSCRIBED_CHANNELS[receivedData.channel].forEach(runSubscribeCallback)
                } else console.warn(`received a message from ${receivedData.sender} in a unsubscribed channel ${receivedData.channel}`)
            }
        ))

        node.start()
        console.log(`Dialer node started with id ${node.peerId.toString()}`)

        this._NODE = await node
        await this.createRelayConnection(node)
        // this should call after createRelayConnection duo to peerId should save after create relay connection
        await Dialer.savePeerIdIfNeed(peerId)

        const resendMessage = async (value: SendDataCommunication): Promise<void> => {
            await value.receiver ?
                await this.sendMessage(value.channel, value.msg, value.receiver) :
                await this.sendMessage(value.channel, value.msg)
        }

        if (this._PENDING_MESSAGE.length > 0) {
            await this._PENDING_MESSAGE.forEach(await resendMessage)
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
        if (!this._RELAY_CONN) {
            this._PENDING_MESSAGE.push(await data)
            console.warn("Message added to pending list due to dialer connection isn't ready")
            return
        }

        const {stream} = await this._RELAY_CONN.newStream(['/broadcast'])
        await pipe(
            [uint8ArrayFromString(`${(JsonBI.stringify(data))}`)],
            stream
        )
        await stream.close()
        return
    }

}

export default Dialer
