import { TestBitcoinRunesNetwork } from './network/TestBitcoinRunesNetwork';
import { generateChainObject } from './testUtils';
import * as testData from './testData';

describe('BitcoinRunesChain', () => {
  describe('getAddressAssets', () => {
    const network = new TestBitcoinRunesNetwork();

    /**
     * @target AbstractChain.getAddressAssets should wrap native token value with Bitcoin BTC and wrap other token values with Bitcoin Runes successfuly
     * @dependencies
     * @scenario
     * - mock a network object to return actual values for the assets
     * - run test
     * - check returned value
     * @expected
     * - it should return the wrapped values
     */
    it('should wrap native token value with Bitcoin BTC and wrap other token values with Bitcoin Runes successfuly', async () => {
      // mock a network object to return actual values for the assets
      const getAddressAssetsSpy = vi.spyOn(network, 'getAddressAssets');
      getAddressAssetsSpy.mockResolvedValueOnce(testData.actualBalance);

      // run test
      const chain = await generateChainObject(
        network,
        undefined,
        testData.multiDecimalTokenMap
      );
      const result = await chain.getAddressAssets('address');

      // check returned value
      expect(result).toEqual(testData.wrappedBalance);
    });
  });
});
