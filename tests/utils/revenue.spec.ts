import { extractRevenueFromView } from '../../src/utils/revenue';
import * as testData from './testData';

describe('extractRevenueFromView', () => {
  /**
   * @target extractRevenueFromView should concat revenues for
   * every events with token name and decimals successfully
   * @dependencies
   * @scenario
   * - mock test data
   * - run test
   * - check returned value
   * @expected
   * - expected RevenueHistory object should be returned
   */
  it('should concat revenues for every events with token name and decimals successfully', async () => {
    const result = await extractRevenueFromView(
      testData.mockedView,
      testData.mockedEntities
    );
    expect(result).toEqual(testData.revenueHistory);
  });
});
