import {
  EcdsaSigner,
  EddsaSigner,
  StatusEnum,
  TssSigner,
} from '@rosen-bridge/tss';
import * as crypto from 'crypto';
import Dialer from '../communication/Dialer';
import Configs from '../configs/Configs';
import { spawn } from 'child_process';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { TssAlgorithms } from '../utils/constants';
import DetectionHandler from '../handlers/DetectionHandler';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class TssHandler {
  private static instance: TssHandler;
  protected static CHANNELS = {
    curve: 'tss-ecdsa-signing',
    edward: 'tss-eddsa-signing',
  };
  protected static tssCurveSigner: TssSigner;
  protected static tssEdwardSigner: TssSigner;
  protected static dialer: Dialer;
  protected static trustKey: string;

  protected constructor() {
    // do nothing.
  }

  /**
   * generates a Tss object if it doesn't exist
   * @returns Tss instance
   */
  public static getInstance = () => {
    if (!TssHandler.instance) throw new Error('Tss is not instantiated yet');
    return TssHandler.instance;
  };

  /**
   * @returns the trust key
   */
  static getTrustKey = (): string => TssHandler.trustKey;

  /**
   * runs tss binary file
   */
  protected static runBinary = (): void => {
    TssHandler.trustKey = crypto.randomUUID();
    const args = [
      '-configFile',
      Configs.tssConfigPath,
      '-guardUrl',
      `http://${Configs.apiHost}:${Configs.apiPort}`,
      '-host',
      `${Configs.tssUrl}:${Configs.tssPort}`,
      '-trustKey',
      TssHandler.trustKey,
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
        setTimeout(TssHandler.runBinary, timeout * 1000);
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
    TssHandler.instance = new TssHandler();
    TssHandler.runBinary();

    // initialize dialer
    TssHandler.dialer = await Dialer.getInstance();

    // initialize guard detection and tss
    await this.initCurveTss();
    await this.initEdwardTss();
  };

  /**
   * initializes curve (ECDSA) tss prerequisites
   */
  static initCurveTss = async () => {
    // initialize tss
    const tssPks = Configs.tssKeys.pubs.map((pub) => pub.curvePub);
    const shareIds = Configs.tssKeys.pubs.map((pub) => pub.curveShareId);

    TssHandler.tssCurveSigner = new EcdsaSigner({
      tssApiUrl: `${Configs.tssUrl}:${Configs.tssPort}`,
      getPeerId: () => Promise.resolve(TssHandler.dialer.getDialerId()),
      callbackUrl: Configs.tssBaseCallBackUrl + '/' + TssAlgorithms.curve,
      shares: shareIds,
      submitMsg: this.generateSubmitMessageWrapper(TssHandler.CHANNELS.curve),
      messageEnc: Configs.tssKeys.secret,
      detection: DetectionHandler.getInstance().getDetection(),
      guardsPk: tssPks,
      signPerRoundLimit: Configs.tssParallelSignCount,
      logger: DefaultLoggerFactory.getInstance().getLogger('tssSigner'),
    });

    // subscribe to channel
    TssHandler.dialer.subscribeChannel(
      TssHandler.CHANNELS.curve,
      async (msg: string, channal: string, peerId: string) =>
        await TssHandler.tssCurveSigner.handleMessage(msg, peerId)
    );
  };

  /**
   * initializes edward (EdDSA) tss prerequisites
   */
  static initEdwardTss = async () => {
    // initialize tss
    const tssPks = Configs.tssKeys.pubs.map((pub) => pub.curvePub);
    const shareIds = Configs.tssKeys.pubs.map((pub) => pub.edwardShareId);

    TssHandler.tssEdwardSigner = new EddsaSigner({
      tssApiUrl: `${Configs.tssUrl}:${Configs.tssPort}`,
      getPeerId: () => Promise.resolve(TssHandler.dialer.getDialerId()),
      callbackUrl: Configs.tssBaseCallBackUrl + '/' + TssAlgorithms.edward,
      shares: shareIds,
      submitMsg: this.generateSubmitMessageWrapper(TssHandler.CHANNELS.edward),
      messageEnc: Configs.tssKeys.secret,
      detection: DetectionHandler.getInstance().getDetection(),
      guardsPk: tssPks,
      signPerRoundLimit: Configs.tssParallelSignCount,
      logger: DefaultLoggerFactory.getInstance().getLogger('tssSigner'),
    });

    // subscribe to channel
    TssHandler.dialer.subscribeChannel(
      TssHandler.CHANNELS.edward,
      async (msg: string, channal: string, peerId: string) =>
        await TssHandler.tssEdwardSigner.handleMessage(msg, peerId)
    );
  };

  /**
   * generates a function to wrap channel send message to dialer
   * @param channel
   */
  protected static generateSubmitMessageWrapper = (channel: string) => {
    return async (msg: string, peers: Array<string>) => {
      if (peers.length === 0) await TssHandler.dialer.sendMessage(channel, msg);
      else
        await Promise.all(
          peers.map(async (peer) =>
            TssHandler.dialer.sendMessage(channel, msg, peer)
          )
        );
    };
  };

  /**
   * wraps sign callback to tss sign handlers
   * @param algorithm ecdsa or eddsa
   * @param status
   * @param error
   * @param message
   * @param signature
   * @param signatureRecovery
   */
  handleSignData = async (
    algorithm: string,
    status: string,
    error: string | undefined,
    message: string,
    signature: string | undefined,
    signatureRecovery: string | undefined
  ) => {
    let tssSigner: TssSigner;
    if (algorithm === TssAlgorithms.curve)
      tssSigner = TssHandler.tssCurveSigner;
    else if (algorithm === TssAlgorithms.edward)
      tssSigner = TssHandler.tssEdwardSigner;
    else throw Error(`Unsupported tss algorithm [${algorithm}]`);

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
   * returns curve (ECDSA) signer function
   */
  get curveSign() {
    return TssHandler.tssCurveSigner.signPromised;
  }

  /**
   * returns (EdDSA) signer signer function
   */
  get edwardSign() {
    return TssHandler.tssEdwardSigner.signPromised;
  }

  /**
   * update tss instances
   */
  update = async (): Promise<void> => {
    await TssHandler.tssCurveSigner.update();
    await TssHandler.tssEdwardSigner.update();
  };
}

export default TssHandler;
