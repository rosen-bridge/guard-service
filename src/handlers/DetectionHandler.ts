import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { GuardDetection } from '@rosen-bridge/detection';
import Dialer from '../communication/Dialer';
import Configs from '../configs/Configs';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class DetectionHandler {
  private static instance: DetectionHandler;
  protected static dialer: Dialer;
  protected static CHANNEL = 'ecdsa-detection';
  protected detection: GuardDetection;

  private constructor() {
    // generate ECDSA guard detection
    const curvePublicKeys = Configs.tssKeys.pubs.map((pub) => pub.curvePub);
    this.detection = new GuardDetection({
      logger: DefaultLoggerFactory.getInstance().getLogger('Detection'),
      guardsPublicKey: curvePublicKeys,
      messageEnc: Configs.tssKeys.encryptor,
      submit: this.generateSubmitMessageWrapper(DetectionHandler.CHANNEL),
      getPeerId: () => Promise.resolve(DetectionHandler.dialer.getDialerId()),
    });
  }

  /**
   * initializes DetectionHandler
   */
  static init = async () => {
    DetectionHandler.dialer = await Dialer.getInstance();
    DetectionHandler.instance = new DetectionHandler();

    // subscribe to channels
    DetectionHandler.dialer.subscribeChannel(
      DetectionHandler.CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await this.instance.detection.handleMessage(msg, peerId)
    );

    // initialize detection instance
    await this.instance.detection.init();

    logger.debug('DetectionHandler initialized');
  };

  /**
   * generates a DetectionHandler object if it doesn't exist
   * @returns DetectionHandler instance
   */
  static getInstance = () => {
    if (!DetectionHandler.instance)
      throw Error(`DetectionHandler instance doesn't exist`);
    return DetectionHandler.instance;
  };

  /**
   * generates a function to wrap channel send message to dialer
   * @param channel
   */
  protected generateSubmitMessageWrapper = (channel: string) => {
    return async (msg: string, peers: Array<string>) => {
      if (peers.length === 0)
        await DetectionHandler.dialer.sendMessage(channel, msg);
      else
        await Promise.all(
          peers.map(async (peer) =>
            DetectionHandler.dialer.sendMessage(channel, msg, peer)
          )
        );
    };
  };

  /**
   * @returns guard detection instance
   */
  getDetection = () => {
    return this.detection;
  };

  /**
   * update guard detection instance
   */
  update = async (): Promise<void> => {
    await this.detection.update();
  };
}

export default DetectionHandler;
