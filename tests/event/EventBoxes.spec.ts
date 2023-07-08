import { cloneDeep } from 'lodash-es';
import EventBoxes from '../../src/event/EventBoxes';
import EventSerializer from '../../src/event/EventSerializer';
import TestUtils from '../testUtils/TestUtils';
import DatabaseActionMock from '../db/mocked/DatabaseAction.mock';
import { mockEventTrigger } from './testData';
import { EventStatus } from '../../src/utils/constants';

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
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        EventStatus.pendingPayment,
        boxSerialized.toString('base64')
      );

      // run test
      const result = await EventBoxes.getEventBox(mockedEvent);

      // verify returned value
      expect(result).toEqual(boxSerialized.toString('hex'));
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
    const rwtCount = 2n;

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
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        boxSerialized.toString('base64')
      );

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 2,
        rwtCount.toString()
      );

      // insert an invalid commitment box into db
      const invalidCommitment = Buffer.from('serialized-box-3');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        invalidCommitment.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent,
        rwtCount
      );

      // verify returned value
      expect(result).toEqual(
        [validCommitment1, validCommitment2].map((buf) => buf.toString('hex'))
      );
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
    it('should filter commitments that their WID are already in event trigger', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        boxSerialized.toString('base64')
      );

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 2,
        rwtCount.toString()
      );

      // insert a commitment box with a WID of event box into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        'serialized-box-3',
        mockedEvent.WIDs[1],
        mockedEvent.height,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent,
        rwtCount
      );

      // verify returned value
      expect(result).toEqual(
        [validCommitment1, validCommitment2].map((buf) => buf.toString('hex'))
      );
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
    it('should return one commitment per WID', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const originalMockedEvent = cloneDeep(mockedEvent);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        boxSerialized.toString('base64')
      );

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      const duplicateWID = TestUtils.generateRandomId();
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2.toString('base64'),
        duplicateWID,
        mockedEvent.height - 2,
        rwtCount.toString()
      );

      // insert a commitment box with duplicate WID into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        'serialized-box-3',
        duplicateWID,
        mockedEvent.height,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent,
        rwtCount
      );

      // verify returned value
      expect(result).toEqual(
        [validCommitment1, validCommitment2].map((buf) => buf.toString('hex'))
      );

      // verify that event remains unchanged
      expect(mockedEvent).toEqual(originalMockedEvent);
    });

    /**
     * @target EventBoxes.getEventValidCommitments should filter commitments
     * with wrong RWT count
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert two valid commitment boxes into db
     * - insert a commitment box with wrong RWT count
     * - run test
     * - verify returned value
     * @expected
     * - it should return serialized string of two valid boxes
     */
    it('should filter commitments with wrong RWT count', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent,
        boxSerialized.toString('base64')
      );

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.height - 2,
        rwtCount.toString()
      );

      // insert a commitment box with wrong RWT count
      await DatabaseActionMock.insertCommitmentBoxRecord(
        EventSerializer.getId(mockedEvent),
        'serialized-box-3',
        TestUtils.generateRandomId(),
        mockedEvent.height,
        (rwtCount + 1n).toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent,
        rwtCount
      );

      // verify returned value
      expect(result).toEqual(
        [validCommitment1, validCommitment2].map((buf) => buf.toString('hex'))
      );
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
        await EventBoxes.getEventValidCommitments(mockedEvent, rwtCount);
      }).rejects.toThrow(Error);
    });
  });
});
