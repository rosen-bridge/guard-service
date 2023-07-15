import {
  EdDSA,
  GuardDetection,
  StatusEnum,
  TssSigner,
} from '@rosen-bridge/tss';
import axios from 'axios';
import CommunicationConfig from '../communication/CommunicationConfig';
import dialer from '../communication/Dialer';
import Dialer from '../communication/Dialer';
import { loggerFactory } from '../log/Logger';
import Configs from '../configs/Configs';
import * as childProcess from 'child_process';
import GuardPkHandler from '../handlers/GuardPkHandler';

const logger = loggerFactory(import.meta.url);
const exec = childProcess.exec;

class Tss {
  private static instance: Tss;
  protected static DETECTION_CHANNEL = 'detection';
  protected static SIGNING_CHANNEL = 'tss-signing';
  protected static dialer: Dialer;
  protected static guardDetection: GuardDetection;
  protected static tssSigner: TssSigner;

  protected constructor() {
    // do nothing.
  }

  /**
   * generates a Tss object if it doesn't exist
   * @returns Tss instance
   */
  public static getInstance = () => {
    if (!Tss.instance) throw new Error('Tss is not instantiated yet');
    return Tss.instance;
  };

  /**
   * runs tss binary file
   */
  protected static runBinary = (): void => {
    const tssPath =
      Configs.tssExecutionPath +
      ' -configFile ' +
      Configs.tssConfigPath +
      ` -guardUrl http://${Configs.apiHost}:${Configs.apiPort}` +
      ` -host ${Configs.tssUrl}:${Configs.tssPort}`;

    exec(tssPath, function (err, data) {
      if (err !== null) {
        const timeout = Configs.tssInstanceRestartGap;
        logger.error(
          `TSS binary failed unexpectedly, TSS will be started in [${timeout}] seconds`
        );
        logger.debug(`Tss failure error: ${err}`);
        logger.debug(`Tss failure data: ${data}`);
        // wait some seconds to start again
        setTimeout(Tss.runBinary, timeout * 1000);
      } else {
        logger.info('TSS binary started');
      }
    });
  };

  /**
   * initializes tss prerequisites
   */
  static init = async () => {
    Tss.instance = new Tss();
    Tss.runBinary();

    // initialize dialer
    Tss.dialer = await Dialer.getInstance();

    // initialize guard detection
    const requiredSign = GuardPkHandler.getInstance().requiredSign;
    const signer = new EdDSA(Configs.tssKeys.secret);
    Tss.guardDetection = new GuardDetection({
      guardsPublicKey: Configs.tssKeys.publicKeys,
      signer: signer,
      submit: this.generateSubmitMessageWrapper(Tss.DETECTION_CHANNEL),
      needGuardThreshold: requiredSign,
      getPeerId: () => Promise.resolve(Tss.dialer.getDialerId()),
    });
    await Tss.guardDetection.init();

    // initialize tss
    Tss.tssSigner = new TssSigner({
      signer: signer,
      detection: Tss.guardDetection,
      guardsPk: Configs.tssKeys.publicKeys,
      tssSignUrl: `${Configs.tssUrl}:${Configs.tssPort}/sign`,
      threshold: requiredSign,
      submitMsg: this.generateSubmitMessageWrapper(Tss.SIGNING_CHANNEL),
      getPeerId: () => Promise.resolve(Tss.dialer.getDialerId()),
      callbackUrl: Configs.tssCallBackUrl,
      shares: Configs.tssKeys.ks,
      logger: loggerFactory('tssSigner'),
    });

    // subscribe to channels
    Tss.dialer.subscribeChannel(
      Tss.DETECTION_CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await Tss.guardDetection.handleMessage(msg, peerId)
    );
    Tss.dialer.subscribeChannel(
      Tss.SIGNING_CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await Tss.tssSigner.handleMessage(msg, peerId)
    );
  };

  static keygen = async (guardsCount: number, threshold: number) => {
    Tss.runBinary();

    // initialize dialer
    Tss.dialer = await Dialer.getInstance();

    Tss.tryCallApi(guardsCount, threshold);
  };

  private static tryCallApi = (guardsCount: number, threshold: number) => {
    const peerIds = Tss.dialer
      .getPeerIds()
      .filter((peerId) => !CommunicationConfig.relays.peerIDs.includes(peerId));
    if (peerIds.length < guardsCount - 1 || !Tss.dialer.getDialerId()) {
      setTimeout(() => Tss.tryCallApi(guardsCount, threshold), 1000);
    } else {
      axios
        .post(`${Configs.tssUrl}:${Configs.tssPort}/keygen`, {
          p2pIDs: [Tss.dialer.getDialerId(), ...peerIds],
          callBackUrl: Configs.tssKeygenCallBackUrl,
          crypto: 'eddsa',
          threshold: threshold,
          peersCount: guardsCount,
        })
        .then((res) => {
          logger.info(res);
        });
    }
  };
  /**
   * generates a function to wrap channel send message to dialer
   * @param channel
   */
  protected static generateSubmitMessageWrapper = (channel: string) => {
    return async (msg: string, peers: Array<string>) => {
      if (peers.length === 0) await Tss.dialer.sendMessage(channel, msg);
      else
        await Promise.all(
          peers.map(async (peer) => Tss.dialer.sendMessage(channel, msg, peer))
        );
    };
  };

  /**
   * wraps sign callback to tss sign handler
   * @param status
   * @param error
   * @param message
   * @param signature
   */
  handleSignData = async (
    status: string,
    error: string | undefined,
    message: string,
    signature: string | undefined
  ) => {
    if (status === 'success')
      await Tss.tssSigner.handleSignData(
        StatusEnum.Success,
        message,
        signature
      );
    else
      await Tss.tssSigner.handleSignData(
        StatusEnum.Failed,
        message,
        undefined,
        error
      );
  };

  /**
   * signs a transaction
   * @param txHash
   */
  sign = async (txHash: Uint8Array): Promise<string> => {
    return Tss.tssSigner.signPromised(Buffer.from(txHash).toString('hex'));
  };

  /**
   * update guard detection and tss
   */
  update = async (): Promise<void> => {
    await Tss.guardDetection.update();
    await Tss.tssSigner.update();
  };
}

export default Tss;
