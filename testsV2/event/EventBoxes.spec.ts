import { cloneDeep } from 'lodash-es';
import EventBoxes from '../../src/event/EventBoxes';
import EventSerializer from '../../src/event/EventSerializer';
import TestUtils from '../../tests/testUtils/TestUtils';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { mockEventTrigger } from './testData';

describe('EventBoxes', () => {
  describe('getEventBox', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventBoxes.getEventBox should return serialized box successfully
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - run test
     * - verify returned value
     * @expected
     * - it should return serialized string of the box
     */
    it('should return serialized box successfully', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // run test
      const result = await EventBoxes.getEventBox(mockedEvent);

      // verify returned value
      expect(result).toEqual(boxSerialized);
    });

    /**
     * @target EventBoxes.getEventBox should throw error when
     * event is not found in database
     * @dependencies
     * - database
     * @scenario
     * - mock an event
     * - run test and expect exception thrown
     * @expected
     * - it should throw error
     */
    it('should throw error when event is not found in database', async () => {
      // mock an event
      const mockedEvent = mockEventTrigger();

      // run test and expect exception thrown
      await expect(async () => {
        await EventBoxes.getEventBox(mockedEvent);
      }).rejects.toThrow(Error);
    });
  });

  describe('getEventValidCommitments', () => {
    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventBoxes.getEventValidCommitments should return serialized
     * boxes successfully
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert two valid commitment boxes into db
     * - insert an invalid commitment box into db
     * - run test
     * - verify returned value
     * @expected
     * - it should return serialized string of two valid boxes
     */
    it('should return serialized boxes successfully', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // insert two valid commitment boxes into db
      const validCommitment1 = 'serialized-box-1';
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1,
        TestUtils.generateRandomId(),
        mockedEvent.height - 1
      );
      const validCommitment2 = 'serialized-box-2';
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2,
        TestUtils.generateRandomId(),
        mockedEvent.height - 2
      );

      // insert an invalid commitment box into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        'serialized-box-3',
        TestUtils.generateRandomId(),
        mockedEvent.height
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(mockedEvent);

      // verify returned value
      expect(result).toEqual([validCommitment1, validCommitment2]);
    });

    /**
     * @target EventBoxes.getEventValidCommitments should filter commitments
     * that their WID are already in event trigger
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert two valid commitment boxes into db
     * - insert a commitment box with a WID of event box into db
     * - run test
     * - verify returned value
     * @expected
     * - it should return serialized string of two valid boxes
     */
    it('should return serialized boxes successfully', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // insert two valid commitment boxes into db
      const validCommitment1 = 'serialized-box-1';
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1,
        TestUtils.generateRandomId(),
        mockedEvent.height - 1
      );
      const validCommitment2 = 'serialized-box-2';
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2,
        TestUtils.generateRandomId(),
        mockedEvent.height - 2
      );

      // insert a commitment box with a WID of event box into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        'serialized-box-3',
        mockedEvent.WIDs[1],
        mockedEvent.height
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(mockedEvent);

      // verify returned value
      expect(result).toEqual([validCommitment1, validCommitment2]);
    });

    /**
     * @target EventBoxes.getEventValidCommitments should return one
     * commitment per WID
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert two valid commitment boxes into db
     * - insert a commitment box with duplicate WID into db
     * - run test
     * - verify returned value
     * - verify that event remains unchanged
     * @expected
     * - it should return serialized string of two valid boxes
     * - it should not mutate the event while filtering duplicates
     */
    it('should return serialized boxes successfully', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const originalMockedEvent = cloneDeep(mockedEvent);
      const boxSerialized = 'boxSerialized';
      await DatabaseActionMock.insertEventRecord(mockedEvent, boxSerialized);

      // insert two valid commitment boxes into db
      const validCommitment1 = 'serialized-box-1';
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1,
        TestUtils.generateRandomId(),
        mockedEvent.height - 1
      );
      const validCommitment2 = 'serialized-box-2';
      const duplicateWID = TestUtils.generateRandomId();
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2,
        duplicateWID,
        mockedEvent.height - 2
      );

      // insert a commitment box with duplicate WID into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        'serialized-box-3',
        duplicateWID,
        mockedEvent.height
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(mockedEvent);

      // verify returned value
      expect(result).toEqual([validCommitment1, validCommitment2]);

      // verify that event remains unchanged
      expect(mockedEvent).toEqual(originalMockedEvent);
    });

    /**
     * @target EventBoxes.getEventValidCommitments should throw error when
     * event is not found in database
     * @dependencies
     * - database
     * @scenario
     * - mock an event
     * - run test and expect exception thrown
     * @expected
     * - it should throw error
     */
    it('should throw error when event is not found in database', async () => {
      // mock an event
      const mockedEvent = mockEventTrigger();

      // run test and expect exception thrown
      await expect(async () => {
        await EventBoxes.getEventValidCommitments(mockedEvent);
      }).rejects.toThrow(Error);
    });
  });
});
