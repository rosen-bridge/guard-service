import { RevenuePeriod } from '../../src/utils/constants';
import Utils from '../../src/utils/utils';
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
        testData.WID,
      );

      expect(result).toEqual(testData.expectedCommitment);
    });
  });

  describe('convertTimestampToLabel', () => {
    /**
     * @target Utils.convertTimestampToLabel should return first day of year successfully
     * @dependencies
     * @scenario
     * - mock time: Wednesday, April 22, 2026 at 11:57:46 AM
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be: Thursday, January 1, 2026 at 12:00:00 AM
     */
    it('should return first day of year successfully', () => {
      const result = Utils.convertTimestampToLabel(
        1776859066,
        RevenuePeriod.year,
      );
      expect(result).toEqual(1767225600000);
    });

    /**
     * @target Utils.convertTimestampToLabel should return first day of month successfully
     * @dependencies
     * @scenario
     * - mock time: Wednesday, April 22, 2026 at 11:57:46 AM
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be: Thursday, April 1, 2026 at 12:00:00 AM
     */
    it('should return first day of month successfully', () => {
      const result = Utils.convertTimestampToLabel(
        1776859066,
        RevenuePeriod.month,
      );
      expect(result).toEqual(1775001600000);
    });

    /**
     * @target Utils.convertTimestampToLabel should return first day of week successfully
     * @dependencies
     * @scenario
     * - mock time: Wednesday, April 22, 2026 at 11:57:46 AM
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be: Sunday, April 19, 2026 at 12:00:00 AM
     */
    it('should return first day of week successfully', () => {
      const result = Utils.convertTimestampToLabel(
        1776859066,
        RevenuePeriod.week,
      );
      expect(result).toEqual(1776556800000);
    });

    /**
     * @target Utils.convertTimestampToLabel should return first day of week even when it's on the previous month
     * @dependencies
     * @scenario
     * - mock time: Thursday, April 2, 2026 at 11:57:46 AM
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be: Sunday, March 29, 2026 at 12:00:00 AM
     */
    it("should return first day of week even when it's on the previous month", () => {
      const result = Utils.convertTimestampToLabel(
        1775131066,
        RevenuePeriod.week,
      );
      expect(result).toEqual(1774742400000);
    });
  });
});
