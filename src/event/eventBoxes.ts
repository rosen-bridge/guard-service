import { EventTrigger } from '@rosen-chains/abstract-chain';
import { CommitmentEntity } from '@rosen-bridge/watcher-data-extractor';
import Utils from '../utils/utils';
import EventSerializer from './eventSerializer';
import { uniqBy } from 'lodash-es';
import { DatabaseAction } from '../db/databaseAction';
import { blake2b } from 'blakejs';

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

    return Buffer.from(eventData.serialized, 'base64').toString('hex');
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
    eventWIDs: string[],
  ): Promise<string[]> => {
    const eventId = EventSerializer.getId(event);
    const eventData = (await DatabaseAction.getInstance().getEventById(eventId))
      ?.eventData;
    if (eventData === undefined)
      throw new Error(`event [${eventId}] not found`);

    const eventBoxHeight = eventData.height;
    const commitments = await DatabaseAction.getInstance().getValidCommitments(
      eventId,
      eventBoxHeight,
    );

    return uniqBy(commitments, 'WID')
      .filter(
        (commitment: CommitmentEntity) =>
          !eventWIDs.includes(commitment.WID) &&
          commitment.rwtCount &&
          BigInt(commitment.rwtCount) === eventRwtCount &&
          Utils.commitmentFromEvent(event, commitment.WID) ===
            commitment.commitment,
      )
      .map((commitment) =>
        Buffer.from(commitment.boxSerialized, 'base64').toString('hex'),
      );
  };

  /**
   * gets WID of commitment boxes that are merged into the event trigger
   * @param event
   * @returns
   */
  static getEventWIDs = async (event: EventTrigger): Promise<string[]> => {
    const eventId = EventSerializer.getId(event);
    const eventWIDs = (
      await DatabaseAction.getInstance().getEventCommitments(eventId)
    ).map((commitment) => commitment.WID);
    const WIDsHash = Buffer.from(
      blake2b(Buffer.from(eventWIDs.join(''), 'hex'), undefined, 32),
    ).toString('hex');

    if (WIDsHash !== event.WIDsHash || eventWIDs.length !== event.WIDsCount)
      throw Error(`Failed to fetch event [${eventId}] WIDs info`);
    return eventWIDs;
  };
}

export default EventBoxes;
