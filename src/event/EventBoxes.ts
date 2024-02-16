import { EventTrigger } from '@rosen-chains/abstract-chain';
import { CommitmentEntity } from '@rosen-bridge/watcher-data-extractor';
import EventSerializer from './EventSerializer';
import { uniqBy } from 'lodash-es';
import { DatabaseAction } from '../db/DatabaseAction';

class EventBoxes {
  /**
   * @param event the event trigger model
   * @returns the serialized string (hex format) of corresponding event trigger box
   */
  static getEventBox = async (event: EventTrigger): Promise<string> => {
    const eventId = EventSerializer.getId(event);
    const eventData = (await DatabaseAction.getInstance().getEventById(eventId))
      ?.eventData;
    if (eventData === undefined)
      throw new Error(`event [${eventId}] not found`);

    return Buffer.from(eventData.boxSerialized, 'base64').toString('hex');
  };

  /**
   * gets the commitment boxes that are created before the event trigger and
   * aren't merged into it, while omitting any duplicate commitments
   * @param event the event trigger model
   * @param eventRwtCount amount RWT token per watcher for the event
   * @param eventWIDs WID of commitments that are merged into the event trigger
   * @returns the serialized string (hex format) of valid commitment boxes
   */
  static getEventValidCommitments = async (
    event: EventTrigger,
    eventRwtCount: bigint,
    eventWIDs: string[]
  ): Promise<string[]> => {
    const eventId = EventSerializer.getId(event);
    const eventData = (await DatabaseAction.getInstance().getEventById(eventId))
      ?.eventData;
    if (eventData === undefined)
      throw new Error(`event [${eventId}] not found`);

    const eventBoxHeight = eventData.height;
    const commitments = await DatabaseAction.getInstance().getValidCommitments(
      eventId,
      eventBoxHeight
    );

    return uniqBy(commitments, 'WID')
      .filter(
        (commitment: CommitmentEntity) =>
          !eventWIDs.includes(commitment.WID) &&
          commitment.rwtCount &&
          BigInt(commitment.rwtCount) === eventRwtCount
      )
      .map((commitment) =>
        Buffer.from(commitment.boxSerialized, 'base64').toString('hex')
      );
  };

  /**
   * gets WID of commitment boxes that are merged into the event trigger
   * @param event
   * @returns
   */
  static getEventWIDs = async (event: EventTrigger): Promise<string[]> => {
    const eventId = EventSerializer.getId(event);
    return (
      await DatabaseAction.getInstance().getEventCommitments(eventId)
    ).map((commitment) => commitment.WID);
  };
}

export default EventBoxes;
