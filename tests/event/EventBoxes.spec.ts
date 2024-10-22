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
      const mockedEvent = mockEventTrigger().event;
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
      const mockedEvent = mockEventTrigger().event;

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
     * - insert event commitment boxes into db
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
      const eventId = EventSerializer.getId(mockedEvent.event);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db
      for (let i = 0; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 2,
        rwtCount.toString()
      );

      // insert an invalid commitment box into db
      const invalidCommitment = Buffer.from('serialized-box-3');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        invalidCommitment.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent.event,
        rwtCount,
        mockedEvent.WIDs
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
     * - insert event commitment boxes into db
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
      const eventId = EventSerializer.getId(mockedEvent.event);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db
      for (let i = 0; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 2,
        rwtCount.toString()
      );

      // insert a commitment box with a WID of event box into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        'serialized-box-3',
        mockedEvent.WIDs[1],
        mockedEvent.event.height,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent.event,
        rwtCount,
        mockedEvent.WIDs
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
     * - insert event commitment boxes into db
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
      const eventId = EventSerializer.getId(mockedEvent.event);
      const originalMockedEvent = cloneDeep(mockedEvent);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db
      for (let i = 0; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      const duplicateWID = TestUtils.generateRandomId();
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment2.toString('base64'),
        duplicateWID,
        mockedEvent.event.height - 2,
        rwtCount.toString()
      );

      // insert a commitment box with duplicate WID into db
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        'serialized-box-3',
        duplicateWID,
        mockedEvent.event.height,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent.event,
        rwtCount,
        mockedEvent.WIDs
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
     * - insert event commitment boxes into db
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
      const eventId = EventSerializer.getId(mockedEvent.event);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db
      for (let i = 0; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 2,
        rwtCount.toString()
      );

      // insert a commitment box with wrong RWT count
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        'serialized-box-3',
        TestUtils.generateRandomId(),
        mockedEvent.event.height,
        (rwtCount + 1n).toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent.event,
        rwtCount,
        mockedEvent.WIDs
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
        await EventBoxes.getEventValidCommitments(
          mockedEvent.event,
          rwtCount,
          mockedEvent.WIDs
        );
      }).rejects.toThrow(Error);
    });

    /**
     * @target EventBoxes.getEventValidCommitments should not return serialized when commitment is invalid
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert event commitment boxes into db
     * - insert one valid commitment box with changed address in event into db
     * - insert one valid commitment box with valid commitment into db
     * - run test
     * - verify returned value
     * @expected
     * - it should return one valid commitment
     */
    it('should not return serialized when commitment is invalid', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent.event);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db
      for (let i = 0; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two valid commitment boxes into db
      const validCommitment1 = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        { ...mockedEvent.event, fromAddress: 'invalid-address' },
        eventId,
        validCommitment1.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const validCommitment2 = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        validCommitment2.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 2,
        rwtCount.toString()
      );

      // run test
      const result = await EventBoxes.getEventValidCommitments(
        mockedEvent.event,
        rwtCount,
        mockedEvent.WIDs
      );

      // verify returned value
      expect(result).toEqual(
        [validCommitment2].map((buf) => buf.toString('hex'))
      );
    });
  });

  describe('getEventWIDs', () => {
    const rwtCount = 2n;

    beforeEach(async () => {
      await DatabaseActionMock.clearTables();
    });

    /**
     * @target EventBoxes.getEventWIDs should return event commitments successfully
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert event commitment boxes into db
     * - insert two commitments for the event into db
     * - run test
     * - verify returned value
     * @expected
     * - it should return serialized string of the box
     */
    it('should return event commitments successfully', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent.event);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db
      for (let i = mockedEvent.WIDs.length - 1; i >= 0; i--) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two commitments for the event into db
      const commitment = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        commitment.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const spentCommitment = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        spentCommitment.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 2,
        rwtCount.toString(),
        TestUtils.generateRandomId(),
        0
      );

      // run test
      const result = await EventBoxes.getEventWIDs(mockedEvent.event);

      // verify returned value
      expect(result).toEqual(mockedEvent.WIDs);
    });

    /**
     * @target EventBoxes.getEventWIDs should throw error when hash of fetched WIDs
     * does not match with WIDsHash in event
     * @dependencies
     * - database
     * @scenario
     * - insert a mocked event into db
     * - insert event commitment boxes into db (not all)
     * - insert two commitments for the event into db
     * - run test and expect exception thrown
     * @expected
     * - it should throw error
     */
    it('should throw error when hash of fetched WIDs does not match with WIDsHash in event', async () => {
      // insert a mocked event into db
      const mockedEvent = mockEventTrigger();
      const eventId = EventSerializer.getId(mockedEvent.event);
      const boxSerialized = Buffer.from('boxSerialized');
      await DatabaseActionMock.insertEventRecord(
        mockedEvent.event,
        boxSerialized.toString('base64')
      );

      // insert event commitment boxes into db (not all)
      for (let i = 1; i < mockedEvent.WIDs.length; i++) {
        await DatabaseActionMock.insertCommitmentBoxRecord(
          mockedEvent.event,
          eventId,
          Buffer.from(`event-serialized-box-${i}`).toString('base64'),
          mockedEvent.WIDs[i],
          mockedEvent.event.height - 4,
          rwtCount.toString(),
          'event-creation-tx-id',
          i
        );
      }

      // insert two commitments for the event into db
      const commitment = Buffer.from('serialized-box-1');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        commitment.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 1,
        rwtCount.toString()
      );
      const spentCommitment = Buffer.from('serialized-box-2');
      await DatabaseActionMock.insertCommitmentBoxRecord(
        mockedEvent.event,
        eventId,
        spentCommitment.toString('base64'),
        TestUtils.generateRandomId(),
        mockedEvent.event.height - 2,
        rwtCount.toString(),
        TestUtils.generateRandomId(),
        0
      );

      // run test and expect exception thrown
      await expect(async () => {
        await EventBoxes.getEventWIDs(mockedEvent.event);
      }).rejects.toThrow(Error);
    });
  });
});
