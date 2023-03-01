import {
  PaymentTransactionModel,
  EventTriggerModel,
  PaymentTransactionJsonModel,
} from './Interfaces';
import Encryption from '../helpers/Encryption';
import Configs from '../helpers/Configs';
import { ConfirmedEventEntity } from '../db/entities/ConfirmedEventEntity';
import Utils from '../helpers/Utils';
import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import { guardConfig } from '../helpers/GuardConfig';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

/* tslint:disable:max-classes-per-file */
class EventTrigger implements EventTriggerModel {
  eventId: string;
  fromChain: string;
  toChain: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  bridgeFee: string;
  networkFee: string;
  sourceChainTokenId: string;
  targetChainTokenId: string;
  sourceTxId: string;
  sourceBlockId: string;
  height: number;
  sourceChainHeight: number;
  WIDs: string[];

  constructor(
    fromChain: string,
    toChain: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    bridgeFee: string,
    networkFee: string,
    sourceChainTokenId: string,
    targetChainTokenId: string,
    sourceTxId: string,
    sourceBlockId: string,
    height: number,
    sourceChainHeight: number,
    WIDs: string[]
  ) {
    this.eventId = Utils.txIdToEventId(sourceTxId);
    this.fromChain = fromChain;
    this.toChain = toChain;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.bridgeFee = bridgeFee;
    this.networkFee = networkFee;
    this.sourceChainTokenId = sourceChainTokenId;
    this.targetChainTokenId = targetChainTokenId;
    this.sourceTxId = sourceTxId;
    this.sourceBlockId = sourceBlockId;
    this.height = height;
    this.sourceChainHeight = sourceChainHeight;
    this.WIDs = WIDs;
  }

  /**
   * creates EventTrigger object from ConfirmedEventEntity scheme
   * @param verifiedEvent
   */
  static fromConfirmedEntity = (
    verifiedEvent: ConfirmedEventEntity
  ): EventTrigger => {
    return EventTrigger.fromEntity(verifiedEvent.eventData);
  };

  /**
   * creates EventTrigger object from EventTriggerEntity scheme
   * @param eventEntity
   */
  static fromEntity = (eventEntity: EventTriggerEntity): EventTrigger => {
    return new EventTrigger(
      eventEntity.fromChain,
      eventEntity.toChain,
      eventEntity.fromAddress,
      eventEntity.toAddress,
      eventEntity.amount,
      eventEntity.bridgeFee,
      eventEntity.networkFee,
      eventEntity.sourceChainTokenId,
      eventEntity.targetChainTokenId,
      eventEntity.sourceTxId,
      eventEntity.sourceBlockId,
      eventEntity.height,
      eventEntity.sourceChainHeight,
      eventEntity.WIDs.split(',').filter((wid) => wid !== '')
    );
  };

  /**
   * @return id of event trigger
   */
  getId = () => {
    return this.eventId;
  };
}

class PaymentTransaction implements PaymentTransactionModel {
  network: string;
  txId: string;
  eventId: string;
  txBytes: Uint8Array;
  txType: string;

  constructor(
    network: string,
    txId: string,
    eventId: string,
    txBytes: Uint8Array,
    txType: string
  ) {
    this.network = network;
    this.txId = txId;
    this.eventId = eventId;
    this.txBytes = txBytes;
    this.txType = txType;
  }

  static fromJson = (jsonString: string): PaymentTransaction => {
    const obj = JSON.parse(jsonString) as PaymentTransactionJsonModel;
    return new PaymentTransaction(
      obj.network,
      obj.txId,
      obj.eventId,
      Utils.hexStringToUint8Array(obj.txBytes),
      obj.txType
    );
  };

  /**
   * @return transaction hex string
   */
  getTxHexString = () => {
    return Buffer.from(this.txBytes).toString('hex');
  };

  /**
   * signs the json data alongside guardId
   * @return signature
   */
  signMetaData = (): string => {
    const idBuffer = Utils.numberToByte(guardConfig.guardId);
    const data = Buffer.concat([this.txBytes, idBuffer]).toString('hex');

    const signature = Encryption.sign(
      data,
      Buffer.from(Configs.guardSecret, 'hex')
    );
    return Buffer.from(signature).toString('hex');
  };

  /**
   * verifies the signature over json data alongside guardId
   * @param signerId id of the signer guard
   * @param msgSignature hex string signature over json data alongside guardId
   * @return true if signature verified
   */
  verifyMetaDataSignature = (
    signerId: number,
    msgSignature: string
  ): boolean => {
    const idBuffer = Utils.numberToByte(signerId);
    const data = Buffer.concat([this.txBytes, idBuffer]).toString('hex');
    const signatureBytes = Buffer.from(msgSignature, 'hex');

    if (signerId >= guardConfig.guardsLen) {
      logger.warn(
        `only ${guardConfig.guardsLen} exists in the network while accessing guard with id ${signerId}`
      );
      return false;
    }
    const publicKey = guardConfig.publicKeys[signerId];
    if (publicKey === undefined) {
      logger.warn(`No guard [${signerId}] found with id`);
      return false;
    }

    return Encryption.verify(
      data,
      signatureBytes,
      Buffer.from(publicKey, 'hex')
    );
  };

  /**
   * @return json representation of the transaction
   */
  toJson = (): string => {
    return JSON.stringify({
      network: this.network,
      txId: this.txId,
      eventId: this.eventId,
      txBytes: this.getTxHexString(),
      txType: this.txType,
    });
  };
}

class EventStatus {
  static pendingPayment = 'pending-payment';
  static pendingReward = 'pending-reward';
  static inPayment = 'in-payment';
  static inReward = 'in-reward';
  static completed = 'completed';
  static rejected = 'rejected';
  static timeout = 'timeout';
  static paymentWaiting = 'payment-waiting';
  static rewardWaiting = 'reward-waiting';
}

class TransactionStatus {
  static approved = 'approved';
  static inSign = 'in-sign';
  static signFailed = 'sign-failed';
  static signed = 'signed';
  static sent = 'sent';
  static invalid = 'invalid';
  static completed = 'completed';
}

class TransactionTypes {
  static payment = 'payment';
  static reward = 'reward';
  static coldStorage = 'cold-storage';
}

enum ConfirmationStatus {
  ConfirmedEnough,
  notConfirmedEnough,
  notFound,
}

export {
  EventTrigger,
  PaymentTransaction,
  EventStatus,
  TransactionStatus,
  TransactionTypes,
  ConfirmationStatus,
};
