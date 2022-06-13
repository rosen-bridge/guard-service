import {SubscribeChannel} from "./CallbackUtils";


class Dialerr {
  private static instance: Dialerr;

  private _SUBSCRIBED_CHANNELS: any = {};
  private _PENDING_MESSAGE: any[] = [];

  private constructor() {
    console.log("Create Dialer Instance!")
  }

  public static getInstance = async (): Promise<Dialerr> => {
    if (!Dialerr.instance) {
      Dialerr.instance = new Dialerr();
      await Dialerr.instance.startDialer()
    }
    return Dialerr.instance;
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
    const callbackObj: any = {
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

  private startDialer = async () => {
    console.log("I'm called")
  }

}

export default Dialerr
