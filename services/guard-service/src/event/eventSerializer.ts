import { blake2b } from 'blakejs';

import { EventTriggerEntity } from '@rosen-bridge/watcher-data-extractor';
import { EventTrigger } from '@rosen-chains/abstract-chain';

import { ConfirmedEventEntity } from '../db/entities/confirmedEventEntity';

class EventSerializer {
  /**
   * gets event id (blake2b hash of sourceTxId)
   * @returns id of event trigger
   */
  static getId = (event: EventTrigger) => {
    return Buffer.from(blake2b(event.sourceTxId, undefined, 32)).toString(
      'hex',
    );
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
