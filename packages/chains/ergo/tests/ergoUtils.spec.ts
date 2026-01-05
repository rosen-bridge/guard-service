import ErgoUtils from '../lib/ergoUtils';
import * as boxTestData from './boxTestData';
import * as ergoTestUtils from './ergoTestUtils';

describe('ErgoUtils', () => {
  describe('getBoxAssets', () => {
    /**
     * @target ErgoUtils.getBoxAssets should get box assets successfully
     * @dependencies
     * @scenario
     * - mock an ErgoBox with assets
     * - run test
     * - check returned value
     * @expected
     * - it should return box assets
     */
    it('should get box assets successfully', () => {
      // mock an ErgoBox with assets
      const box = ergoTestUtils.toErgoBox(boxTestData.ergoBox1);
      const assets = boxTestData.box1Assets;

      // run test
      const result = ErgoUtils.getBoxAssets(box);

      // check returned value
      expect(result).toEqual(assets);
    });
  });
});
