import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { createDialerNode, RosenDialerNode } from '@rosen-bridge/dialer';
import RoseNetNodeConfig from '../configs/RoseNetNodeConfig';
import { readPrivateKeyFromFile } from '@rosen-bridge/rosenet-utils';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class RosenDialer {
  private static instance: RosenDialer;
  protected dialer: RosenDialerNode;

  private constructor() {
    logger.info('RoseNet constructor called.');
  }

  /**
   * initializes RosenDialer
   */
  static init = async () => {
    RosenDialer.instance = new RosenDialer();
    this.instance.dialer = await this.instance.startNode();
  };

  /**
   * @return a RosenDialer instance
   */
  static getInstance = () => {
    if (!RosenDialer.instance) {
      throw Error(`RosenDialer instance doesn't exist`);
    }
    return RosenDialer.instance;
  };

  /**
   * @return a RoseNetDialer instance
   */
  getDialer = () => {
    return this.dialer;
  };

  /**
   * config a dialer node
   * @return a rosen dialer node object after start node
   */
  private startNode = async () => {
    const privateKey = await readPrivateKeyFromFile(
      RoseNetNodeConfig.peerIdFilePath
    ).catch((error) => {
      logger.error(
        'An error occurred while getting RoseNet private key from file'
      );
      logger.debug(error?.message ?? 'Unknown error message');
      process.exit(1);
    });
    const dialer = await createDialerNode({
      relay: {
        multiaddrs: RoseNetNodeConfig.relays,
      },
      host: RoseNetNodeConfig.host,
      port: RoseNetNodeConfig.port,
      privateKey,
      logger: logger,
    });
    logger.info('Rosen Dialer started');
    await dialer._node.start();
    return dialer;
  };
}

export default RosenDialer;
