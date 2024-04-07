import {
  ECDSA,
  EcdsaSigner,
  EdDSA,
  EddsaSigner,
  GuardDetection,
  StatusEnum,
  TssSigner,
} from '@rosen-bridge/tss';
import axios from 'axios';
import CommunicationConfig from '../communication/CommunicationConfig';
import Dialer from '../communication/Dialer';
import Configs from '../configs/Configs';
import { spawn } from 'child_process';
import WinstonLogger from '@rosen-bridge/winston-logger';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

class Tss {
  private static instance: Tss;
  protected static curveGuardDetection: GuardDetection;
  protected static tssCurveSigner: TssSigner;
  protected static curve = {
    DETECTION_CHANNEL: 'ecdsa-detection',
    SIGNING_CHANNEL: 'tss-ecdsa-signing',
  };
  protected static edwardGuardDetection: GuardDetection;
  protected static tssEdwardSigner: TssSigner;
  protected static edward = {
    DETECTION_CHANNEL: 'eddsa-detection',
    SIGNING_CHANNEL: 'tss-eddsa-signing',
  };
  protected static dialer: Dialer;

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
    const args = [
      '-configFile',
      Configs.tssConfigPath,
      '-guardUrl',
      `http://${Configs.apiHost}:${Configs.apiPort}`,
      '-host',
      `${Configs.tssUrl}:${Configs.tssPort}`,
    ];
    spawn(Configs.tssExecutionPath, args, {
      detached: false,
      stdio: 'ignore',
    })
      .addListener('close', (code) => {
        const timeout = Configs.tssInstanceRestartGap;
        logger.error(
          `TSS binary failed unexpectedly, TSS will be started in [${timeout}] seconds`
        );
        logger.debug(`Tss failure error code: ${code}`);
        // wait some seconds to start again
        setTimeout(Tss.runBinary, timeout * 1000);
      })
      .addListener('spawn', () => {
        logger.info('TSS binary started');
      })
      .addListener('error', (err: Error) => {
        logger.error(`an error occured when trying to spawn: ${err}`);
      })
      .addListener('disconnect', () => {
        logger.warn(`received 'disconnect' signal from tss spawner`);
      })
      .addListener('exit', (code: number, signal: string) => {
        logger.warn(
          `received 'exit' signal from tss spawner, exit code: ${code}, signal: ${signal}`
        );
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

    // initialize guard detection and tss
    await this.initCurveTss();
    await this.initEdwardTss();
  };

  /**
   * initializes curve (ECDSA) tss prerequisites
   */
  static initCurveTss = async () => {
    // initialize guard detection
    const ecdsaSigner = new ECDSA(Configs.tssKeys.secret);
    Tss.curveGuardDetection = new GuardDetection({
      guardsPublicKey: Configs.tssKeys.ecdsa.publicKeys,
      signer: ecdsaSigner,
      submit: this.generateSubmitMessageWrapper(Tss.curve.DETECTION_CHANNEL),
      getPeerId: () => Promise.resolve(Tss.dialer.getDialerId()),
    });
    await Tss.curveGuardDetection.init();

    // initialize tss
    Tss.tssCurveSigner = new EcdsaSigner({
      tssApiUrl: `${Configs.tssUrl}:${Configs.tssPort}`,
      getPeerId: () => Promise.resolve(Tss.dialer.getDialerId()),
      callbackUrl: Configs.tssCallBackUrl,
      shares: Configs.tssKeys.ks,
      submitMsg: this.generateSubmitMessageWrapper(Tss.curve.SIGNING_CHANNEL),
      secret: Configs.tssKeys.secret,
      detection: Tss.curveGuardDetection,
      guardsPk: Configs.tssKeys.ecdsa.publicKeys,
      logger: WinstonLogger.getInstance().getLogger('tssSigner'),
      chainCode: Configs.tssKeys.ecdsa.chainCode,
      derivationPath: Configs.tssKeys.ecdsa.derivationPath,
    });

    // subscribe to channels
    Tss.dialer.subscribeChannel(
      Tss.curve.DETECTION_CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await Tss.curveGuardDetection.handleMessage(msg, peerId)
    );
    Tss.dialer.subscribeChannel(
      Tss.curve.SIGNING_CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await Tss.tssCurveSigner.handleMessage(msg, peerId)
    );
  };

  /**
   * initializes edward (EdDSA) tss prerequisites
   */
  static initEdwardTss = async () => {
    // initialize guard detection
    const eddsaSigner = new EdDSA(Configs.tssKeys.secret);
    Tss.edwardGuardDetection = new GuardDetection({
      guardsPublicKey: Configs.tssKeys.eddsa.publicKeys,
      signer: eddsaSigner,
      submit: this.generateSubmitMessageWrapper(Tss.edward.DETECTION_CHANNEL),
      getPeerId: () => Promise.resolve(Tss.dialer.getDialerId()),
    });
    await Tss.edwardGuardDetection.init();

    // initialize tss
    Tss.tssEdwardSigner = new EddsaSigner({
      tssApiUrl: `${Configs.tssUrl}:${Configs.tssPort}`,
      getPeerId: () => Promise.resolve(Tss.dialer.getDialerId()),
      callbackUrl: Configs.tssCallBackUrl,
      shares: Configs.tssKeys.ks,
      submitMsg: this.generateSubmitMessageWrapper(Tss.edward.SIGNING_CHANNEL),
      secret: Configs.tssKeys.secret,
      detection: Tss.edwardGuardDetection,
      guardsPk: Configs.tssKeys.eddsa.publicKeys,
      logger: WinstonLogger.getInstance().getLogger('tssSigner'),
      chainCode: Configs.tssKeys.eddsa.chainCode,
    });

    // subscribe to channels
    Tss.dialer.subscribeChannel(
      Tss.edward.DETECTION_CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await Tss.edwardGuardDetection.handleMessage(msg, peerId)
    );
    Tss.dialer.subscribeChannel(
      Tss.edward.SIGNING_CHANNEL,
      async (msg: string, channal: string, peerId: string) =>
        await Tss.tssEdwardSigner.handleMessage(msg, peerId)
    );
  };

  /**
   * start keygen process for guards
   * @param guardsCount
   * @param threshold
   */
  static keygen = async (guardsCount: number, threshold: number) => {
    Tss.runBinary();

    // initialize dialer
    Tss.dialer = await Dialer.getInstance();

    Tss.tryCallApi(guardsCount, threshold);
  };

  /**
   * wait until all peers are connected then call tss keygen api
   * @param guardsCount
   * @param threshold
   */
  private static tryCallApi = (guardsCount: number, threshold: number) => {
    const peerIds = Tss.dialer
      .getPeerIds()
      .filter((peerId) => !CommunicationConfig.relays.peerIDs.includes(peerId));
    if (peerIds.length < guardsCount - 1 || !Tss.dialer.getDialerId()) {
      setTimeout(() => Tss.tryCallApi(guardsCount, threshold), 1000);
    } else {
      setTimeout(() => {
        axios
          .post(`${Configs.tssUrl}:${Configs.tssPort}/keygen`, {
            p2pIDs: [Tss.dialer.getDialerId(), ...peerIds],
            callBackUrl: Configs.tssKeygenCallBackUrl,
            crypto: Configs.keygen.algorithm(),
            threshold: threshold,
            peersCount: guardsCount,
            operationTimeout: 10 * 60, // 10 minutes
          })
          .then((res) => {
            logger.info(JSON.stringify(res.data));
          })
          .catch((err) => {
            logger.error(`an error occurred during call keygen ${err}`);
            logger.debug(err.stack);
          });
      }, 10000);
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
   * wraps sign callback to tss sign handlers
   * @param status
   * @param error
   * @param message
   * @param signature
   * @param signatureRecovery
   */
  handleSignData = async (
    isEdDSA: boolean,
    status: string,
    error: string | undefined,
    message: string,
    signature: string | undefined,
    signatureRecovery: string | undefined
  ) => {
    const tssSigner = isEdDSA ? Tss.tssEdwardSigner : Tss.tssCurveSigner;
    if (status === 'success')
      await tssSigner.handleSignData(
        StatusEnum.Success,
        message,
        signature,
        signatureRecovery
      );
    else
      await tssSigner.handleSignData(
        StatusEnum.Failed,
        message,
        undefined,
        undefined,
        error
      );
  };

  /**
   * signs a transaction using curve (ECDSA) signer
   * @param txHash
   */
  curveSign = async (txHash: Uint8Array): Promise<string> => {
    return Tss.tssEdwardSigner.signPromised(
      Buffer.from(txHash).toString('hex')
    );
  };

  /**
   * signs a transaction using edward (EdDSA) signer
   * @param txHash
   */
  edwardSign = async (txHash: Uint8Array): Promise<string> => {
    return Tss.tssEdwardSigner.signPromised(
      Buffer.from(txHash).toString('hex')
    );
  };

  /**
   * update guard detection and tss
   */
  update = async (): Promise<void> => {
    await Tss.curveGuardDetection.update();
    await Tss.edwardGuardDetection.update();
    await Tss.tssCurveSigner.update();
    await Tss.tssEdwardSigner.update();
  };
}

export default Tss;
