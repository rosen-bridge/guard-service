import { EventTrigger } from '@rosen-chains/abstract-chain';
import GuardsErgoConfigs from '../helpers/GuardsErgoConfigs';
import ChainHandler from '../handlers/ChainHandler';
import {
  ConfirmationStatus,
  TransactionTypes,
} from '@rosen-chains/abstract-chain';
import { dbAction } from '../db/DatabaseAction';
import EventSerializer from '../event/EventSerializer';
import { Fee } from '@rosen-bridge/minimum-fee';
import EventBoxes from '../event/EventBoxes';

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
}

export default EventVerifier;
