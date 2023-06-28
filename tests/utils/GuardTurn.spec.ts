import GuardTurn from '../../src/utils/GuardTurn';
import TestConfigs from '../testUtils/TestConfigs';

describe('GuardTurn', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TestConfigs.currentTimeStamp));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('secondsToNextTurn', () => {
    /**
     * @target GuardTurn.secondsToNextTurn should return seconds
     * to guard next turn successfully
     * @dependencies
     * - Date
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - should return correct value according to mocked timestamp
     */
    it('should return seconds to guard next turn successfully', () => {
      const result = GuardTurn.secondsToNextTurn();
      expect(result).toEqual(690);
    });
  });

  describe('guardTurn', () => {
    /**
     * @target GuardTurn.guardTurn should return guard turn successfully
     * @dependencies
     * - Date
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - should return correct value according to mocked timestamp
     */
    it('guardTurn should return guard turn successfully', () => {
      const result = GuardTurn.guardTurn();
      expect(result).toEqual(2);
    });
  });

  describe('secondsToReset', () => {
    /**
     * @target GuardTurn.secondsToReset should return seconds
     * to end of current guard turn successfully
     * @dependencies
     * - Date
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - should return correct value according to mocked timestamp
     */
    it('secondsToReset should return seconds to end of current guard turn successfully', () => {
      const result = GuardTurn.secondsToReset();
      expect(result).toEqual(90);
    });
  });
});
