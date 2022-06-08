import {createLibp2p, Libp2p} from 'libp2p'
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
import {JsonBI} from "../utils/parser"
import {Connection, Stream} from "@libp2p/interfaces/src/connection";
import {SubscribeChannel} from "./CallbackUtils";


class Dialer {
  private static instance: Dialer;

  private _NODE: Libp2p | undefined;
  private _RELAY_CONN: Connection | undefined;
  private _SUBSCRIBED_CHANNELS: any = {};
  private _PENDING_MESSAGE: any[] = [];

  private constructor() { }

  public static getInstance = async (): Promise<Dialer> => {
    if (!Dialer.instance) {
      Dialer.instance = new Dialer();
      await Dialer.instance.startDialer()
    }
    return Dialer.instance;
  }

  getSubscribedChannels = (): string[] => {
    return Object.keys(this._SUBSCRIBED_CHANNELS)
  }

  /**
   * establish connection to relay
   * @param channel: string desire channel for subscription
   * @param callback: a callback function for subscribed channel
   * @param url: string for apiCallbackFunction
   */
  subscribeChannel = (channel: string, callback: SubscribeChannel, url?: string): void => {
    let callbackObj: any = {
      func: callback
    }
    if(url) callbackObj.url = url

    if(this._SUBSCRIBED_CHANNELS[channel])
      this._SUBSCRIBED_CHANNELS[channel].push(callbackObj)
    else {
      this._SUBSCRIBED_CHANNELS[channel] = []
      this._SUBSCRIBED_CHANNELS[channel].push(callbackObj)
    }
  }

  /**
   * establish connection to relay
   * @param node: Libp2p
   */
  private createRelayConnection = async (node: Libp2p) : Promise<void> => {
    if(!this._RELAY_CONN){
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

    const node = await createLibp2p({
      transports: [
        new WebSockets()
      ],
      connectionEncryption: [
        new Noise()
      ],
      streamMuxers: [
        new Mplex()
      ],
      pubsub: new FloodSub(),
      peerDiscovery: [
        new Bootstrap({
          interval: CommunicationConfig.bootstrapInterval,
          list: [CommunicationConfig.relay]
        }),
        new PubSubPeerDiscovery({
          interval: CommunicationConfig.pubsubInterval
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
          const receivedData: any = await JsonBI.parse(receivedDataObj)

          const runSubscribeCallback = async (value: any): Promise<void> => {
            value.url ?
                value.func(receivedData.msg, receivedData.channel, receivedData.sender, value.url) :
                value.func(receivedData.msg, receivedData.channel, receivedData.sender)
          }
          if(this._SUBSCRIBED_CHANNELS[receivedData.channel]){
            console.log(`a message received in subscribed channel ${receivedData.channel} from ${receivedData.sender}`)
            this._SUBSCRIBED_CHANNELS[receivedData.channel].forEach(runSubscribeCallback)
          }
        }
    ))

    node.start()
    console.log(`Dialer node started with id ${node.peerId.toString()}`)

    this._NODE = await node
    await this.createRelayConnection(node)

    const resendMessage = async (value: any): Promise<void> => {
      await value.receiver ?
          await this.sendMessage(value.channel, value.msg, value.receiver) :
          await this.sendMessage(value.channel, value.msg)
    }

    if(this._PENDING_MESSAGE.length > 0){
      await this._PENDING_MESSAGE.forEach(await resendMessage)
    }
  }

  /**
   * send message to specific peer or broadcast it
   * @param channel: String
   * @param msg: any (JsonBI)
   * @param receiver optional
   */
  sendMessage = async (channel: string, msg: any, receiver?: string): Promise<void> => {
    const data: any = {
      "msg": msg,
      "channel": channel
    }
    if(receiver) data.receiver = receiver
    if(!this._RELAY_CONN){
      this._PENDING_MESSAGE.push(await data)
      console.warn("Message added to pending list due to dialer connection isn't ready")
      return
    }

    const {stream} = await this._RELAY_CONN.newStream(['/broadcast'])
    await pipe(
        [await uint8ArrayFromString(`${(JsonBI.stringify(data))}`)],
        stream
    )
    await stream.close()
    return
  }

}

export default Dialer
