import ColdStorageConfig from '../../src/coldStorage/ColdStorageConfig';

describe('ColdStorageConfig', () => {
  describe('isWithinTime', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1658005354291000));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    /**
     * @target ColdStorageConfig.isWithinTime should return true
     * when current timestamp is within hours
     * @dependencies
     * - Date
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - returned value should be true
     */
    it('should return true when current timestamp is within config hours', async () => {
      const result = ColdStorageConfig.isWithinTime();
      expect(result).to.equal(true);
    });
  });
});
