import ErgoUtils from '../../../../src/chains/ergo/helpers/ErgoUtils';
import { Boxes } from '../../../../src/chains/ergo/models/Interfaces';
import {
  mockGetBoxesForErgoTree,
  resetMockedExplorerApi,
} from '../mocked/MockedExplorer';
import { expect } from 'chai';
import ExplorerApi from '../../../../src/chains/ergo/network/ExplorerApi';
import { beforeEach } from 'mocha';
import TestBoxes from '../testUtils/TestBoxes';

describe('ExplorerApi', () => {
  const testBankAddress = TestBoxes.testLockAddress;
  const testBankErgoTree: string =
    ErgoUtils.addressStringToErgoTreeString(testBankAddress);

  describe('getCoveringErgAndTokenForErgoTree', () => {
    // mock getting bankBoxes
    const bankBoxes: Boxes = TestBoxes.mockManyBankBoxes();

    beforeEach('mock ExplorerApi', function () {
      resetMockedExplorerApi();
      mockGetBoxesForErgoTree(testBankErgoTree, bankBoxes);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return empty list with covered flag', async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('0')
      );
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(0);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes that cover requested erg amount', async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('1000000000')
      );
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(1);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes that cover requested erg and token amount', async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('1000000000'),
        {
          ['068354ba0c3990e387a815278743577d8b2d098cad21c95dc795e3ae721cf906']:
            BigInt('123456789123456789'),
        }
      );
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(3);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return all boxes
     */
    it('should return all boxes with covered flag', async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('100000000000'),
        {
          ['907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e']:
            BigInt('100'),
        }
      );
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(14);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return enough boxes
     */
    it('should return enough boxes which is more than 10 boxes that cover requested erg amount', async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('230000000000')
      );
      expect(boxes.covered).to.be.true;
      expect(boxes.boxes.length).to.equal(12);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return all boxes
     */
    it('should return all boxes with not-covered flag', async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('555666771000000000')
      );
      expect(boxes.covered).to.be.false;
      expect(boxes.boxes.length).to.equal(14);
    });

    /**
     * Target: testing getCoveringErgAndTokenForErgoTree
     * Dependencies:
     *    ExplorerApi
     * Expected Output:
     *    The function should return all boxes
     */
    it("should return all boxes with not-covered flag when can't cover tokens", async () => {
      // run test
      const boxes = await ExplorerApi.getCoveringErgAndTokenForErgoTree(
        testBankErgoTree,
        BigInt('1000000000'),
        {
          ['907a31bdadad63e44e5b3a132eb5be218e694270fae6fa55b197ecccac19f87e']:
            BigInt('500'),
        }
      );
      expect(boxes.covered).to.be.false;
      expect(boxes.boxes.length).to.equal(14);
    });
  });
});
