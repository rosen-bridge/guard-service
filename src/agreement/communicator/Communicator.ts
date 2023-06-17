import { AbstractLogger } from '@rosen-bridge/logger-interface';
import { EncryptionHandler } from './EncryptionHandler';
import { CommunicationMessage } from './types';
import { guardMessageValidTimeoutDefault } from './const';
import { Timestamp } from 'typeorm';

// TODO: replace this class with same one in tss package (#243)
export abstract class Communicator {
  protected logger: AbstractLogger;
  protected signer: EncryptionHandler;
  private readonly submitMessage: (
    msg: string,
    peers: Array<string>
  ) => unknown;
  protected guardPks: Array<string>;
  protected index = -1;
  protected messageValidDuration: number;

  protected constructor(
    logger: AbstractLogger,
    signer: EncryptionHandler,
    submitMessage: (msg: string, peers: Array<string>) => unknown,
    guardPks: Array<string>,
    messageValidDurationSeconds?: number
  ) {
    this.logger = logger;
    this.signer = signer;
    this.guardPks = guardPks;
    this.submitMessage = submitMessage;
    this.messageValidDuration = messageValidDurationSeconds
      ? messageValidDurationSeconds
      : guardMessageValidTimeoutDefault;
  }

  protected getIndex = async () => {
    if (this.index === -1) {
      const pk = await this.signer.getPk();
      this.index = this.guardPks.indexOf(pk);
    }
    return this.index;
  };

  protected sendMessage = async (
    messageType: string,
    payload: any,
    peers: Array<string>,
    timestamp?: number
  ) => {
    timestamp = timestamp ? timestamp : Math.round(Date.now() / 1000);
    const publicKey = await this.signer.getPk();
    const payloadSign = await this.signer.sign(
      `${JSON.stringify(payload)}${timestamp}${publicKey}`
    );
    const message: CommunicationMessage = {
      type: messageType,
      payload: payload,
      publicKey,
      timestamp,
      sign: payloadSign,
      index: await this.getIndex(),
    };
    this.submitMessage(JSON.stringify(message), peers);
  };

  abstract processMessage: (
    type: string,
    payload: unknown,
    signature: string,
    senderIndex: number,
    peerId: string,
    timestamp: number
  ) => unknown;

  handleMessage = async (message: string, peerId: string) => {
    const msg: CommunicationMessage = JSON.parse(
      message
    ) as CommunicationMessage;
    const guardPk = this.guardPks[msg.index];
    if (
      Math.round(Date.now() / 1000) - this.messageValidDuration >
      msg.timestamp
    ) {
      this.logger.warn('Invalid message. message timed out');
      this.logger.debug(message);
      return;
    }
    if (guardPk !== msg.publicKey) {
      this.logger.warn(
        'Invalid message. Sender index mismatch with sender public key'
      );
      this.logger.debug(message);
      return;
    }
    if (
      !(await this.signer.verify(
        `${JSON.stringify(msg.payload)}${msg.timestamp}${msg.publicKey}`,
        msg.sign,
        guardPk
      ))
    ) {
      this.logger.warn('Invalid message. Message signature is invalid');
      this.logger.debug(message);
      return;
    }
    await this.processMessage(
      msg.type,
      msg.payload,
      msg.sign,
      msg.index,
      peerId,
      msg.timestamp
    );
  };
}
