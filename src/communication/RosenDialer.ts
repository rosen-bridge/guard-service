import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { createDialerNode, RosenDialerNode } from '@rosen-bridge/dialer';
import RoseNetNodeConfig from '../configs/RoseNetNodeConfig';
import { readPrivateKeyFromFile } from '@rosen-bridge/rosenet-utils';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);
class RosenDialer {
  private static instance: RosenDialer;
  private static dialer: RosenDialerNode;

  private constructor() {
    logger.info('RoseNet constructor called.');
  }

  /**
   * @return a RoseNet instance (create if it doesn't exist)
   */
  public static getInstance = async () => {
    if (!RosenDialer.instance && !RosenDialer.dialer) {
      logger.debug("RoseNet instance didn't exist, creating a new one.");
      RosenDialer.instance = new RosenDialer();
      this.dialer = await RosenDialer.instance.startNode();
    }
    return RosenDialer.dialer;
  };

  /**
   * TODO: fix doc string
   * config a dialer node with peerDiscovery
   * @return a Libp2p object after start node
   */
  private startNode = async () => {
    const privateKey = await readPrivateKeyFromFile(
      RoseNetNodeConfig.p2pFilePath
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
