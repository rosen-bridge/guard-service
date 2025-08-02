import {
  MultiSigHandler as ErgoMultiSig,
  MultiSigUtils,
} from '@rosen-bridge/ergo-multi-sig';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import Configs from '../configs/Configs';
import { RosenDialerNode } from '@rosen-bridge/dialer';
import DetectionHandler from './DetectionHandler';
import RosenDialer from '../communication/RosenDialer';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class MultiSigHandler {
  private static instance: MultiSigHandler;
  protected static CHANNEL = 'ergo-multi-sig';
  protected static dialer: RosenDialerNode;
  protected ergoMultiSig: ErgoMultiSig;

  private constructor(multiSigUtilsInstance: MultiSigUtils) {
    this.ergoMultiSig = new ErgoMultiSig({
      logger: DefaultLoggerFactory.getInstance().getLogger('MultiSig'),
      multiSigUtilsInstance: multiSigUtilsInstance,
      messageEnc: Configs.tssKeys.encryptor,
      secretHex: Configs.guardSecret,
      txSignTimeout: Configs.txSignTimeout,
      multiSigFirstSignDelay: Configs.multiSigFirstSignDelay,
      submit: this.generateSubmitMessageWrapper(MultiSigHandler.CHANNEL),
      guardDetection: DetectionHandler.getInstance().getDetection(),
      commGuardsPk: Configs.tssKeys.pubs.map((p) => p.curvePub),
      ergoGuardPks: [],
    });
  }

  static init = async (multiSigUtilsInstance: MultiSigUtils) => {
    MultiSigHandler.dialer = RosenDialer.getInstance().getDialer();
    MultiSigHandler.instance = new MultiSigHandler(multiSigUtilsInstance);

    // subscribe to channels
    MultiSigHandler.dialer.subscribeChannel(
      MultiSigHandler.CHANNEL,
      async (msg: string, channel: string, peerId: string) =>
        await this.instance.ergoMultiSig.handleMessage(msg, peerId)
    );

    logger.debug('MultiSigHandler initialized');
  };

  static getInstance = () => {
    if (!MultiSigHandler.instance)
      throw Error(`MultiSigHandler instance doesn't exist`);
    return MultiSigHandler.instance;
  };

  /**
   * generates a function to wrap channel send message to dialer
   * @param channel
   */
  protected generateSubmitMessageWrapper = (channel: string) => {
    return async (msg: string, peers: Array<string>) => {
      if (peers.length === 0)
        await MultiSigHandler.dialer.sendMessage(channel, msg);
      else
        await Promise.all(
          peers.map(async (peer) =>
            MultiSigHandler.dialer.sendMessage(channel, msg, peer)
          )
        );
    };
  };

  /**
   * @returns ErgoMultiSig instance
   */
  getErgoMultiSig = () => {
    return this.ergoMultiSig;
  };
}

export default MultiSigHandler;
