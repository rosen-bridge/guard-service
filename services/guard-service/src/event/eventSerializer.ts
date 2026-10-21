import { blake2b } from 'blakejs';

import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import { EventTrigger } from '@rosen-chains/abstract-chain';
import { BITCOIN_CASH_CHAIN } from '@rosen-chains/bitcoin-cash';

import { ConfirmedEventEntity } from '../db/entities/confirmedEventEntity';

const BCH_GUARD_EVENT_DOMAIN = 'rosen:guard-event:bitcoin-cash:v1:';

class EventSerializer {
  /**
   * gets the unchanged on-chain request id from the original sourceTxId text
   */
  static getRequestId = (event: Pick<EventTrigger, 'sourceTxId'>) => {
    return Buffer.from(blake2b(event.sourceTxId, undefined, 32)).toString(
      'hex',
    );
  };

  /**
   * gets the guard event key; BCH has a separate source namespace
   * while every existing source chain retains its original identity
   */
  static getId = (event: Pick<EventTrigger, 'fromChain' | 'sourceTxId'>) => {
    if (event.fromChain !== BITCOIN_CASH_CHAIN) return this.getRequestId(event);
    return Buffer.from(
      blake2b(BCH_GUARD_EVENT_DOMAIN + event.sourceTxId, undefined, 32),
    ).toString('hex');
  };

  /**
   * creates EventTrigger object from EventTriggerEntity scheme
   * @param eventEntity
   */
  static fromEntity = (eventEntity: EventTriggerEntity): EventTrigger => {
    return {
      height: eventEntity.height,
      fromChain: eventEntity.fromChain,
      toChain: eventEntity.toChain,
      fromAddress: eventEntity.fromAddress,
      toAddress: eventEntity.toAddress,
      amount: eventEntity.amount,
      bridgeFee: eventEntity.bridgeFee,
      networkFee: eventEntity.networkFee,
      sourceChainTokenId: eventEntity.sourceChainTokenId,
      targetChainTokenId: eventEntity.targetChainTokenId,
      sourceTxId: eventEntity.sourceTxId,
      sourceChainHeight: eventEntity.sourceChainHeight,
      sourceBlockId: eventEntity.sourceBlockId,
      WIDsHash: eventEntity.WIDsHash,
      WIDsCount: eventEntity.WIDsCount,
    };
  };

  /**
   * creates EventTrigger object from ConfirmedEventEntity scheme
   * @param verifiedEvent
   */
  static fromConfirmedEntity = (
    verifiedEvent: ConfirmedEventEntity,
  ): EventTrigger => {
    return this.fromEntity(verifiedEvent.eventData);
  };
}

export default EventSerializer;
