import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { ECDSA, EdDSA, GuardDetection } from '@rosen-bridge/tss';
import Configs from '../configs/Configs';
import { RosenDialerNode } from '@rosen-bridge/dialer';
import RosenDialer from '../communication/RosenDialer';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class DetectionHandler {
  private static instance: DetectionHandler;
  protected static dialer: RosenDialerNode;
  protected static CHANNELS = {
    curve: 'ecdsa-detection',
    edward: 'eddsa-detection',
  };
  protected curveDetection: GuardDetection;
  protected edwardDetection: GuardDetection;

  private constructor() {
    // generate ECDSA guard detection
    // const curvePublicKeys = Configs.tssKeys.pubs.map((pub) => pub.curvePub);
    // const ecdsaSigner = new ECDSA(Configs.tssKeys.secret);
    // this.curveDetection = new GuardDetection({
    //   guardsPublicKey: curvePublicKeys,
    //   signer: ecdsaSigner,
    //   submit: this.generateSubmitMessageWrapper(
    //     DetectionHandler.CHANNELS.curve
    //   ),
    //   getPeerId: () => Promise.resolve(DetectionHandler.dialer.getDialerId()),
    // });
    //
    // // generate EdDSA guard detection
    // const edwardPublicKeys = Configs.tssKeys.pubs.map((pub) => pub.edwardPub);
    // const eddsaSigner = new EdDSA(Configs.tssKeys.secret);
    // this.edwardDetection = new GuardDetection({
    //   guardsPublicKey: edwardPublicKeys,
    //   signer: eddsaSigner,
    //   submit: this.generateSubmitMessageWrapper(
    //     DetectionHandler.CHANNELS.edward
    //   ),
    //   getPeerId: () => Promise.resolve(DetectionHandler.dialer.getDialerId()),
    // });
  }

  /**
   * initializes DetectionHandler
   */
  static init = async () => {
    DetectionHandler.dialer = await RosenDialer.getInstance();
    DetectionHandler.instance = new DetectionHandler();
    //
    // // initialize detection instances
    // await this.instance.curveDetection.init();
    // await this.instance.edwardDetection.init();
    //
    // // subscribe to channels
    // DetectionHandler.dialer.subscribeChannel(
    //   DetectionHandler.CHANNELS.curve,
    //   async (msg: string, channal: string, peerId: string) =>
    //     await this.instance.curveDetection.handleMessage(msg, peerId)
    // );
    // DetectionHandler.dialer.subscribeChannel(
    //   DetectionHandler.CHANNELS.edward,
    //   async (msg: string, channal: string, peerId: string) =>
    //     await this.instance.edwardDetection.handleMessage(msg, peerId)
    // );

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
   * @returns both ECDSA and EdDSA guard detection instances
   */
  getDetection = () => {
    return {
      curve: this.curveDetection,
      edward: this.edwardDetection,
    };
  };

  /**
   * update guard detection instances
   */
  update = async (): Promise<void> => {
    const pps = await DetectionHandler.dialer._node.info.getDiscoveredPeers();
    console.log(
      'test',
      await DetectionHandler.dialer._node.info.getDiscoveredPeers()
    );
    console.log(
      'test1',
      DetectionHandler.dialer._node.info.getConnectedPeers()
    );
    const x = DetectionHandler.dialer.getPeerIds(true);
    console.log('test2', x);
    await DetectionHandler.dialer._node.publish('broadcast', 'hooy2');
    await DetectionHandler.dialer.sendMessage('test', 'hoyy4');
    pps[1] &&
      (await DetectionHandler.dialer.sendMessage('test', 'FUCKKK', pps[1]));
    for (const d of x) {
      console.log('test3', d);
      await DetectionHandler.dialer.sendMessage('test', 'hoyy1', d);
      DetectionHandler.dialer._node.sendMessage(d, 'hooy3', async (e) => {
        console.log('ERROR');
        console.log(e && e.message);
      });
    }
    // await this.curveDetection.update();
    // await this.edwardDetection.update();
  };
}

export default DetectionHandler;
