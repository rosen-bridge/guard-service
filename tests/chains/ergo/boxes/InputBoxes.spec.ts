import { expect } from 'chai';
import { cloneDeep, shuffle } from 'lodash-es';
import { beforeEach } from 'mocha';

import { resetMockedInputBoxes } from '../mocked/MockedInputBoxes';
import TestBoxes from '../testUtils/TestBoxes';
import {
  clearTables,
  insertCommitmentBoxRecord,
  insertEventRecord,
} from '../../../db/mocked/MockedScannerModel';
import Utils from '../../../../src/helpers/Utils';
import InputBoxes from '../../../../src/chains/ergo/boxes/InputBoxes';
import TestUtils from '../../../testUtils/TestUtils';
import ErgoConfigs from '../../../../src/chains/ergo/helpers/ErgoConfigs';
import { Constant, ErgoBoxCandidate } from 'ergo-lib-wasm-nodejs';
import ErgoUtils from '../../../../src/chains/ergo/helpers/ErgoUtils';

describe('InputBoxes', () => {
  const mockedEvent = TestBoxes.mockErgPaymentEventTrigger();
  const boxes = TestBoxes.mockEventBoxWithSomeCommitments();
  const eventBox = boxes[0];
  const commitmentBoxes = boxes.slice(1);

  describe('getEventBox', () => {
    beforeEach('clear db tables', async () => {
      await clearTables();
      resetMockedInputBoxes();
    });

    /**
     * Target: testing getEventBox
     * Dependencies:
     *    dbAction
     * Scenario:
     *    Insert mocked event box into db
     *    Run test
     *    Expect to receive a box with same id as mocked event box
     * Expected Output:
     *    The function should return the box
     */
    it('should return ErgoBox object successfully', async () => {
      await insertEventRecord(
        mockedEvent,
        '',
        Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()),
        200
      );

      // run test
      const result = await InputBoxes.getEventBox(mockedEvent);
      expect(result.box_id().to_str()).to.equal(eventBox.box_id().to_str());
    });
  });

  describe('getEventValidCommitments', () => {
    beforeEach('clear db tables', async () => {
      await clearTables();
      resetMockedInputBoxes();
    });

    /**
     * Target: testing getEventValidCommitments
     * Dependencies:
     *    dbAction
     * Scenario:
     *    Insert mocked commitment boxes into db
     *    Run test
     *    Expect to receive commitment boxes which created before requested height
     * Expected Output:
     *    The function should return right boxes
     */
    it('should return ErgoBox objects of valid commitments successfully', async () => {
      await insertEventRecord(
        mockedEvent,
        '',
        Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()),
        1000,
        '',
        200
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(
          commitmentBoxes[0].sigma_serialize_bytes()
        ),
        TestUtils.generateRandomId(),
        201
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(
          commitmentBoxes[1].sigma_serialize_bytes()
        ),
        TestUtils.generateRandomId(),
        199
      );

      // run test
      const result = await InputBoxes.getEventValidCommitments(mockedEvent);
      expect(result.length).to.equal(1);
      expect(result[0].box_id().to_str()).to.equal(
        commitmentBoxes[1].box_id().to_str()
      );
    });

    /**
     * Target: testing getEventValidCommitments
     * Dependencies:
     *    dbAction
     * Scenario:
     *    Generate commitment box using a WID of eventBox
     *    Insert mocked event and commitment boxes into db
     *    Run test
     *    Check return value
     * Expected Output:
     *    The function should return right boxes
     */
    it('should filter commitments which their WIDs are already in event trigger', async () => {
      // Generate commitment box using a WID of eventBox
      const invalidCommitmentBox = TestBoxes.mockCommitmentBox(
        mockedEvent.WIDs[1]
      ).sigma_serialize_bytes();

      // insert mocked event and commitment boxes into db
      await insertEventRecord(
        mockedEvent,
        '',
        Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()),
        1000,
        '',
        200
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(invalidCommitmentBox),
        mockedEvent.WIDs[1],
        199
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(
          commitmentBoxes[1].sigma_serialize_bytes()
        ),
        TestUtils.generateRandomId(),
        199
      );

      // run test
      const result = await InputBoxes.getEventValidCommitments(mockedEvent);
      expect(result.length).to.equal(1);
      expect(result[0].box_id().to_str()).to.equal(
        commitmentBoxes[1].box_id().to_str()
      );
    });

    /**
     * Target: testing getEventValidCommitments
     * Dependencies:
     *    dbAction
     * Scenario:
     *    Generate two commitment boxes with same WID
     *    Insert mocked event and commitment boxes into db
     *    Run test
     *    Check return value
     * Expected Output:
     *    The function should return right boxes
     */
    it('should return one commitment per WID', async () => {
      // Generate commitment box using a WID of eventBox
      const wid = TestUtils.generateRandomId();
      const commitmentBox1 = TestBoxes.mockCommitmentBox(wid);
      const commitmentBox2 = TestBoxes.mockCommitmentBox(wid);

      // insert mocked event and commitment boxes into db
      await insertEventRecord(
        mockedEvent,
        '',
        Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()),
        1000,
        '',
        200
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(commitmentBox1.sigma_serialize_bytes()),
        wid,
        199
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(commitmentBox2.sigma_serialize_bytes()),
        wid,
        199
      );

      // run test
      const result = await InputBoxes.getEventValidCommitments(mockedEvent);
      expect(result.length).to.equal(1);
      expect(result[0].box_id().to_str()).to.equal(
        commitmentBox1.box_id().to_str()
      );
    });

    /**
     * Target:
     * It should not mutate the event when filtering duplicate commitments
     *
     * Dependencies:
     * - dbAction
     *
     * Scenario:
     * - Generate two commitment boxes with same WID
     * - Insert mocked event and commitment boxes into db
     *
     * Expected output:
     * The event should not be mutated
     */
    it('should not mutate the event when filtering duplicate commitments', async () => {
      const wid = TestUtils.generateRandomId();
      const commitmentBox1 = TestBoxes.mockCommitmentBox(wid);
      const commitmentBox2 = TestBoxes.mockCommitmentBox(wid);
      const clonedMockedEvent = cloneDeep(mockedEvent);
      const expected = clonedMockedEvent;

      await insertEventRecord(
        mockedEvent,
        '',
        Utils.Uint8ArrayToBase64String(eventBox.sigma_serialize_bytes()),
        1000,
        '',
        200
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(commitmentBox1.sigma_serialize_bytes()),
        wid,
        199
      );
      await insertCommitmentBoxRecord(
        mockedEvent.getId(),
        Utils.Uint8ArrayToBase64String(commitmentBox2.sigma_serialize_bytes()),
        wid,
        199
      );

      await InputBoxes.getEventValidCommitments(mockedEvent);

      const actual = mockedEvent;
      expect(actual).to.deep.equal(expected);
    });
  });

  describe('compareTwoBoxCandidate', () => {
    /**
     * Target: testing compareTwoBoxCandidate
     * Dependencies:
     *    -
     * Scenario:
     *    Mock four ErgoBoxCandidate (3 different addresses, with or without register on same address)
     *    Sort them
     *    Check sorted list
     * Expected Output:
     *    The function should sort the boxes correctly
     */
    it('should be able to be used for sorting various boxes', async () => {
      // mock box with lowest register value for permit address
      const box1 = TestBoxes.mockErgoBoxCandidate(
        500000n,
        [],
        ErgoConfigs.ergoContractConfig.eventTriggerContract,
        [
          {
            registerId: 4,
            value: Constant.from_coll_coll_byte([Buffer.from('aaaa')]),
          },
        ]
      );
      // mock box with permit address
      const box2 = TestBoxes.mockErgoBoxCandidate(
        500000n,
        [],
        ErgoConfigs.ergoContractConfig.eventTriggerContract,
        [
          {
            registerId: 4,
            value: Constant.from_coll_coll_byte([Buffer.from('bbbb')]),
          },
        ]
      );
      // mock box with event trigger address and register
      const box3 = TestBoxes.mockErgoBoxCandidate(
        500000n,
        [],
        ErgoUtils.addressStringToContract(TestBoxes.testLockAddress),
        [
          {
            registerId: 4,
            value: Constant.from_coll_coll_byte([Buffer.from('aabb')]),
          },
        ]
      );
      // mock box with commitment address
      const box4 = TestBoxes.mockErgoBoxCandidate(
        500000n,
        [],
        ErgoConfigs.ergoContractConfig.commitmentContract,
        []
      );

      // mock five ErgoBoxCandidate
      const expectedList = [box1, box2, box3, box4];
      const boxes = shuffle([box1, box2, box3, box4]);

      // sort boxes
      boxes.sort(InputBoxes.compareTwoBoxCandidate);

      // check sorted list
      //  check ergoTrees
      const ergoTreeMapMethod = (box: ErgoBoxCandidate) =>
        box.ergo_tree().to_base16_bytes();
      expect(boxes.map(ergoTreeMapMethod)).to.deep.equal(
        expectedList.map(ergoTreeMapMethod)
      );
      //  check registers
      const registerMapMethod = (box: ErgoBoxCandidate) => {
        const value = box.register_value(4)?.to_coll_coll_byte()[0];
        return value ? Buffer.from(value).toString() : '';
      };
      expect(boxes.map(registerMapMethod)).to.deep.equal(
        expectedList.map(registerMapMethod)
      );
    });
  });
});
