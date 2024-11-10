import Utils from '../../src/utils/Utils';
import * as testData from './testData';

describe('Utils', () => {
  describe('convertMnemonicToSecretKey', () => {
    /**
     * @target Utils.convertMnemonicToSecretKey should return correct secret key
     * in hex string format from mnemonic
     * @dependencies
     * @scenario
     * - mock mnemonic and corresponding secret key
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be expected secret
     */
    it('should return correct secret key in hex string format from mnemonic', () => {
      const mnemonic =
        'route like two trophy tank excite cigar hockey sketch pencil curious memory tissue admit december';
      const secret =
        'ab866ee1a6663ac3027e353c4bddc0c2b44bcd2439df4acca3596613f3c9bf41';

      const result = Utils.convertMnemonicToSecretKey(mnemonic);

      expect(result).toEqual(secret);
    });
  });

  describe('commitmentFromEvent', () => {
    /**
     * @target Utils.commitmentFromEvent should return commitment successfully
     * @dependencies
     * @scenario
     * - mock event and corresponding commit hash
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be expected hash
     */
    it('should return commitment successfully', () => {
      const result = Utils.commitmentFromEvent(
        testData.mockedEventForCommitment,
        testData.WID
      );

      expect(result).toEqual(testData.expectedCommitment);
    });
  });
});
