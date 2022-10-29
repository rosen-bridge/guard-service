import { logger } from '../../log/Logger';
import { Communication } from './Communication';
import configs from '../../helpers/Configs';
import * as wasm from 'ergo-lib-wasm-nodejs';
import ergoConfigs from '../../chains/ergo/helpers/ErgoConfigs';
import {
  MessageCallback,
  SendDataCommunication,
  Subscription,
} from './Interfaces';
import { apiCallBack } from '../CallbackUtils';
import CommunicationConfig from './CommunicationConfig';
import { guardConfig, GuardConfig } from '../../helpers/GuardConfig';

class Dialer {
  private static instance: Dialer;
  private communication: Communication;
  private readonly peerId: string;
  private timeout: NodeJS.Timeout;
  private subscriptions: Subscription = {};

  private constructor() {
    const secret = wasm.SecretKey.dlog_from_bytes(configs.secret);
    this.peerId = secret.get_address().to_base58(ergoConfigs.networkType);
    this.communication = new Communication(this.peerId, secret);
    logger.info(`Create Dialer Instance! Id: ${this.peerId}`);
  }

  /**
   * @return a Dialer instance (create if it doesn't exist)
   */
  public static getInstance = (): Dialer => {
    if (!Dialer.instance) {
      Dialer.instance = new Dialer();
      Dialer.instance.communication.fetchMessage().then(() => {
        Dialer.instance.pullMessages().then(() => null);
      });
    }
    return Dialer.instance;
  };

  /**
   * Get incoming messages from server and handle them
   */
  public pullMessages = async () => {
    this.communication
      .fetchMessage()
      .then((messages) => {
        messages.forEach((message) => {
          const messageJSON = JSON.parse(
            message.message
          ) as SendDataCommunication;
          const channel = messageJSON.channel;
          const body = messageJSON.msg;
          if (channel in this.subscriptions) {
            const subscriptions = this.subscriptions[channel];
            subscriptions.urls.forEach((subscription) => {
              apiCallBack(body, channel, message.sender, subscription.url);
            });
            subscriptions.functions.forEach((subscription) => {
              subscription.func(body, channel, message.sender);
            });
          }
        });
      })
      .catch((exp) => {
        logger.error(`can not connect to backend. ${exp}`);
      });
    this.timeout = setTimeout(
      () => this.pullMessages().then(() => null),
      CommunicationConfig.pullInterval * 1000
    );
  };

  /**
   * @return string of PeerID
   */
  getPeerId = (): string => {
    return this.peerId.toString();
  };

  /**
   * subscribe a channel messages
   * @param options: subscription options
   */
  public subscribe = (options: {
    channel: string;
    callback?: MessageCallback;
    id?: string;
    url?: string;
  }): void => {
    if (options.url) {
      this.subscribeUrl(options.channel, options.url);
    } else {
      if (options.callback === undefined || options.id === undefined) {
        throw new Error(
          'Both callback and id required for function subscription'
        );
      }
      this.subscribeFunction(options.channel, options.callback, options.id);
    }
  };

  public subscribeFunction = (
    channel: string,
    callback: MessageCallback,
    id: string
  ): void => {
    if (Object.prototype.hasOwnProperty.call(this.subscriptions, channel)) {
      const subscriptions = this.subscriptions[channel];
      if (subscriptions.functions.filter((item) => item.id === id).length > 0) {
        logger.info('A redundant subscribed channel detected!');
        return;
      }
      this.subscriptions[channel].functions.push({ func: callback, id: id });
    } else {
      this.subscriptions[channel] = {
        urls: [],
        functions: [{ func: callback, id: id }],
      };
    }
  };

  public subscribeUrl = (channel: string, url: string): void => {
    if (Object.prototype.hasOwnProperty.call(this.subscriptions, channel)) {
      const subscriptions = this.subscriptions[channel];
      if (subscriptions.urls.filter((item) => item.url === url).length > 0) {
        logger.info(
          'A redundant subscribed channel detected! from external source'
        );
        return;
      }
      this.subscriptions[channel].urls.push({ url: url });
    } else {
      this.subscriptions[channel] = { urls: [{ url: url }], functions: [] };
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
    if (receiver) {
      await this.communication.putMessage(JSON.stringify(data), [receiver]);
    } else {
      await this.communication.putMessage(
        JSON.stringify(data),
        guardConfig.publicKeys.map((item) =>
          wasm.Address.from_public_key(Buffer.from(item, 'hex')).to_base58(
            ergoConfigs.networkType
          )
        )
      );
    }
    return;
  };
}

export default Dialer;
