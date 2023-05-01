import { EventTrigger } from '@rosen-chains/abstract-chain';
import ErgoConfigs from '../chains/ergo/helpers/ErgoConfigs';
import ChainHandler from '../handlers/ChainHandler';
import {
  ConfirmationStatus,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { dbAction } from '../db/DatabaseAction';
import EventSerializer from '../event/EventSerializer';
import MinimumFee from '../event/MinimumFee';
import { Fee } from '@rosen-bridge/minimum-fee';

class EventVerifier {
  /**
   * checks if event source tx and event trigger box confirmed enough
   * @param event the event trigger
   * @param serializedEventBox serialized string of the event box
   */
  static isEventConfirmedEnough = async (
    event: EventTrigger,
    serializedEventBox: string
  ): Promise<boolean> => {
    // check if the event box in ergo chain confirmed enough
    const ergoChain = ChainHandler.getErgoChain();
    const eventBoxCreationHeight = ergoChain.getBoxHeight(serializedEventBox);
    const ergoCurrentHeight = await ergoChain.getHeight();
    if (
      ergoCurrentHeight - eventBoxCreationHeight <
      ErgoConfigs.eventConfirmation
    )
      return false;

    // check if lock transaction in source chain confirmed enough
    const sourceChain = ChainHandler.getChain(event.fromChain);
    const txConfirmationStatus = await sourceChain.getTxConfirmationStatus(
      event.sourceTxId,
      TransactionTypes.lock
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
    feeConfig: Fee
  ): Promise<boolean> => {
    // get event box
    const eventId = EventSerializer.getId(event);
    const eventBox = (await dbAction.getEventById(eventId))?.eventData
      .boxSerialized;
    if (eventBox === undefined) throw new Error(`event [${eventId}] not found`);

    return ChainHandler.getChain(event.fromChain).verifyEvent(
      event,
      eventBox,
      feeConfig
    );
  };
}

export default EventVerifier;
