import { EventTrigger, TransactionType } from '@rosen-chains/abstract-chain';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import ChainHandler from '../handlers/ChainHandler';
import { ConfirmationStatus } from '@rosen-chains/abstract-chain';
import { ChainMinimumFee } from '@rosen-bridge/minimum-fee';
import EventBoxes from '../event/EventBoxes';
import { ConfirmedEventEntity } from '../db/entities/ConfirmedEventEntity';
import { EventStatus } from '../utils/constants';
import EventSynchronization from '../synchronization/EventSynchronization';

class EventVerifier {
  /**
   * checks if event source tx and event trigger box confirmed enough
   * @param event the event trigger
   */
  static isEventConfirmedEnough = async (
    event: EventTrigger
  ): Promise<boolean> => {
    // check if the event box in ergo chain confirmed enough
    const ergoChain = ChainHandler.getInstance().getErgoChain();
    const eventHeight = event.height;
    const ergoCurrentHeight = await ergoChain.getHeight();
    if (ergoCurrentHeight - eventHeight < GuardsErgoConfigs.eventConfirmation)
      return false;

    // check if lock transaction in source chain confirmed enough
    const sourceChain = ChainHandler.getInstance().getChain(event.fromChain);
    const txConfirmationStatus = await sourceChain.getTxConfirmationStatus(
      event.sourceTxId,
      TransactionType.lock
    );
    return txConfirmationStatus === ConfirmationStatus.ConfirmedEnough;
  };

  /**
   * conforms event data with lock transaction in source chain
   * @param event the trigger event
   * @param feeConfig minimum fee and rsn ratio config for the event
   * @returns true if event data verified
   */
  static verifyEvent = async (
    event: EventTrigger,
    feeConfig: ChainMinimumFee
  ): Promise<boolean> => {
    // get event box
    const eventBox = await EventBoxes.getEventBox(event);

    // verify event data
    const fromChain = ChainHandler.getInstance().getChain(event.fromChain);
    const valid = await fromChain.verifyEvent(event, feeConfig);
    // verify event rwt
    return (
      valid &&
      ChainHandler.getInstance()
        .getErgoChain()
        .verifyEventRWT(eventBox, fromChain.getRWTToken())
    );
  };

  /**
   * checks if event status is pending to requested tx type
   * @param eventEntity the trigger event object in db
   * @param type the requested tx type
   * @returns true if event status is compatible with requested type
   */
  static isEventPendingToType = (
    eventEntity: ConfirmedEventEntity,
    type: string
  ): boolean => {
    if (
      eventEntity.status === EventStatus.pendingPayment &&
      type === TransactionType.payment
    )
      return true;
    else if (
      eventEntity.status === EventStatus.pendingReward &&
      type === TransactionType.reward
    )
      return true;
    else {
      if (
        eventEntity.status === EventStatus.pendingPayment &&
        type === TransactionType.reward
      ) {
        EventSynchronization.getInstance().addEventToQueue(eventEntity.id);
      }
      return false;
    }
  };
}

export default EventVerifier;
