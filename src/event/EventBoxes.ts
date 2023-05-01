import { EventTrigger } from '@rosen-chains/abstract-chain';
import { CommitmentEntity } from '@rosen-bridge/watcher-data-extractor';
import { dbAction } from '../db/DatabaseAction';
import EventSerializer from './EventSerializer';
import { uniqBy } from 'lodash-es';

class EventBoxes {
  /**
   * @param event the event trigger model
   * @returns the serialized string of corresponding event trigger box
   */
  static getEventBox = async (event: EventTrigger): Promise<string> => {
    const eventId = EventSerializer.getId(event);
    const eventData = (await dbAction.getEventById(eventId))?.eventData;
    if (eventData === undefined)
      throw new Error(`event [${eventId}] not found`);

    return eventData.boxSerialized;
  };

  /**
   * gets the commitment boxes that are created before the event trigger and
   * aren't merged into it, while omitting any duplicate commitments
   * @param event the event trigger model
   * @returns the serialized string of valid commitment boxes
   */
  static getEventValidCommitments = async (
    event: EventTrigger
  ): Promise<string[]> => {
    const eventId = EventSerializer.getId(event);
    const eventData = (await dbAction.getEventById(eventId))?.eventData;
    if (eventData === undefined)
      throw new Error(`event [${eventId}] not found`);

    const eventBoxHeight = eventData.height;
    const commitments = await dbAction.getValidCommitments(
      eventId,
      eventBoxHeight
    );

    return uniqBy(commitments, 'WID')
      .filter(
        (commitment: CommitmentEntity) => !event.WIDs.includes(commitment.WID)
      )
      .map((commitment) => commitment.boxSerialized);
  };
}

export default EventBoxes;
