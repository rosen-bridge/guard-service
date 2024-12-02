import { TokenMap } from '@rosen-bridge/tokens';
import { AssetBalance, ChainUtils, PaymentOrder, ValueError } from '../lib';
import {
  actualBalance,
  encodedOrder,
  organizedOrder,
  sortedTokens,
  testTokenMap,
  unorganizedAssetBalance,
  unorganizedOrder,
  unwrappedBalance,
  wrappedBalance,
} from './testData';
import JsonBigInt from '@rosen-bridge/json-bigint';

describe('ChainUtils', () => {
  describe('isEqualAssetBalance', () => {
    /**
     * @target ChainUtils.isEqualAssetBalance should return true when assets are
     * equal
     * @dependencies
     * @scenario
     * - mock an AssetBalance
     * - run test
     * - check returned value
     * @expected
     * - it should return true
     */
    it('should return true when assets are equal', () => {
      // mock an AssetBalance
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b = structuredClone(a);

      // run test
      const result = ChainUtils.isEqualAssetBalance(a, b);

      // check returned value
      expect(result).toEqual(true);
    });

    /**
     * @target ChainUtils.isEqualAssetBalance should return false when
     * native token is NOT equal
     * @dependencies
     * @scenario
     * - mock two AssetBalance with different native token value
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when native token is NOT equal', () => {
      // mock two AssetBalance with different native token value
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b = structuredClone(a);
      b.nativeToken = 1n;

      // run test
      const result = ChainUtils.isEqualAssetBalance(a, b);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target ChainUtils.isEqualAssetBalance should return false when a token
     * is missing in first object
     * @dependencies
     * @scenario
     * - mock two AssetBalance (second object has 1 more token)
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when a token is missing in first object', () => {
      // mock two AssetBalance (second object has 1 more token)
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };

      // run test
      const result = ChainUtils.isEqualAssetBalance(a, b);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target ChainUtils.isEqualAssetBalance should return false when a token
     * is missing in second object
     * @dependencies
     * @scenario
     * - mock two AssetBalance (first object has 1 more token)
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when a token is missing in second object', () => {
      // mock two AssetBalance (first object has 1 more token)
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
        ],
      };

      // run test
      const result = ChainUtils.isEqualAssetBalance(a, b);

      // check returned value
      expect(result).toEqual(false);
    });

    /**
     * @target ChainUtils.isEqualAssetBalance should return false when a token
     * value is not equal
     * @dependencies
     * @scenario
     * - mock two AssetBalance with different token value
     * - run test
     * - check returned value
     * @expected
     * - it should return false
     */
    it('should return false when a token value is not equal', () => {
      // mock two AssetBalance with different token value
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b = structuredClone(a);
      b.tokens[1].value = 2n;

      // run test
      const result = ChainUtils.isEqualAssetBalance(a, b);

      // check returned value
      expect(result).toEqual(false);
    });
  });

  describe('sumAssetBalance', () => {
    /**
     * @target ChainUtils.sumAssetBalance should return aggregated assets
     * successfully
     * @dependencies
     * @scenario
     * - mock two AssetBalance
     * - run test
     * - check returned value
     * @expected
     * - it should return aggregated assets
     */
    it('should return aggregated assets successfully', () => {
      // mock two AssetBalance
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 200n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
          {
            id: 'id3',
            value: 30n,
          },
        ],
      };

      // run test
      const result = ChainUtils.sumAssetBalance(a, b);

      // check returned value
      expect(result).toEqual({
        nativeToken: 300n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
          {
            id: 'id3',
            value: 30n,
          },
        ],
      });
    });

    /**
     * @target ChainUtils.sumAssetBalance should NOT mitigate original objects
     * @dependencies
     * @scenario
     * - mock two AssetBalance
     * - run test
     * - check passed objects
     * @expected
     * - passed objects should be the same
     */
    it('should NOT mitigate original objects', () => {
      // mock two AssetBalance
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 200n,
        tokens: [
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };

      // run test
      ChainUtils.sumAssetBalance(a, b);

      // check passed objects
      expect(a).toEqual({
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
        ],
      });
      expect(b).toEqual({
        nativeToken: 200n,
        tokens: [
          {
            id: 'id2',
            value: 20n,
          },
        ],
      });
    });
  });

  describe('reduceAssetBalance', () => {
    /**
     * @target ChainUtils.reduceAssetBalance should return remaining assets
     * successfully
     * @dependencies
     * @scenario
     * - mock two AssetBalance
     * - run test
     * - check returned value
     * @expected
     * - it should return aggregated assets
     */
    it('should return remaining assets successfully', () => {
      // mock two AssetBalance
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 50n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
        ],
      };

      // run test
      const result = ChainUtils.subtractAssetBalance(a, b);

      // check returned value
      expect(result).toEqual({
        nativeToken: 50n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      });
    });

    /**
     * @target ChainUtils.reduceAssetBalance should throw exception when
     * native token is not enough
     * @dependencies
     * @scenario
     * - mock two AssetBalance (second object has more native token)
     * - run test & check thrown exception
     * @expected
     * - it should return aggregated assets
     */
    it('should throw exception when native token is not enough', () => {
      // mock two AssetBalance (second object has more native token)
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [],
      };
      const b: AssetBalance = {
        nativeToken: 500n,
        tokens: [],
      };

      // run test & check thrown exception
      expect(() => {
        ChainUtils.subtractAssetBalance(a, b);
      }).toThrow(ValueError);
    });

    /**
     * @target ChainUtils.reduceAssetBalance should throw exception when
     * a token is not enough
     * @dependencies
     * @scenario
     * - mock two AssetBalance (second object has more value for a token)
     * - run test & check thrown exception
     * @expected
     * - it should return aggregated assets
     */
    it('should throw exception when a token value is not enough', () => {
      // mock two AssetBalance (second object has more value for a token)
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 50n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
        ],
      };

      // run test & check thrown exception
      expect(() => {
        ChainUtils.subtractAssetBalance(a, b);
      }).toThrow(ValueError);
    });

    /**
     * @target ChainUtils.reduceAssetBalance should throw exception when
     * a token is missing
     * @dependencies
     * @scenario
     * - mock two AssetBalance (second object has a token is missing in first object)
     * - run test & check thrown exception
     * @expected
     * - it should return aggregated assets
     */
    it('should throw exception when native token is missing', () => {
      // mock two AssetBalance (second object has a token is missing in first object)
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 50n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 50n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 10n,
          },
        ],
      };

      // run test & check thrown exception
      expect(() => {
        ChainUtils.subtractAssetBalance(a, b);
      }).toThrow(ValueError);
    });

    /**
     * @target ChainUtils.reduceAssetBalance should NOT mitigate original objects
     * @dependencies
     * @scenario
     * - mock two AssetBalance
     * - run test
     * - check passed objects
     * @expected
     * - passed objects should be the same
     */
    it('should NOT mitigate original objects', () => {
      // mock two AssetBalance
      const a: AssetBalance = {
        nativeToken: 300n,
        tokens: [
          {
            id: 'id1',
            value: 50n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 200n,
        tokens: [
          {
            id: 'id1',
            value: 20n,
          },
        ],
      };

      // run test
      ChainUtils.subtractAssetBalance(a, b);

      // check passed objects
      expect(a).toEqual({
        nativeToken: 300n,
        tokens: [
          {
            id: 'id1',
            value: 50n,
          },
        ],
      });
      expect(b).toEqual({
        nativeToken: 200n,
        tokens: [
          {
            id: 'id1',
            value: 20n,
          },
        ],
      });
    });

    /**
     * @target ChainUtils.reduceAssetBalance should return remaining tokens
     * with 0 native token when negative native token is allowed
     * @dependencies
     * @scenario
     * - mock two AssetBalance
     * - run test
     * - check returned value
     * @expected
     * - it should return aggregated tokens with 0 native token
     */
    it('should return remaining tokens with 0 native token when negative native token is allowed', () => {
      // mock two AssetBalance
      const a: AssetBalance = {
        nativeToken: 100n,
        tokens: [
          {
            id: 'id1',
            value: 10n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      };
      const b: AssetBalance = {
        nativeToken: 500n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
        ],
      };

      // run test
      const result = ChainUtils.subtractAssetBalance(a, b, 0n, true);

      // check returned value
      expect(result).toEqual({
        nativeToken: 0n,
        tokens: [
          {
            id: 'id1',
            value: 5n,
          },
          {
            id: 'id2',
            value: 20n,
          },
        ],
      });
    });
  });

  describe('wrapAssetBalance', () => {
    /**
     * @target ChainUtils.wrapAssetBalance should wrap all values successfully
     * @dependencies
     * @scenario
     * - generate tokenMap object with multi decimals
     * - run test
     * - check returned value
     * @expected
     * - it should return the expected wrapped values
     */
    it('should wrap all values successfully', () => {
      // mock an AssetBalance
      const tokenMap = new TokenMap(testTokenMap);

      // run test
      const result = ChainUtils.wrapAssetBalance(
        actualBalance,
        tokenMap,
        'test-native-token',
        'test'
      );

      // check returned value
      expect(result).toEqual(wrappedBalance);
    });
  });

  describe('unwrapAssetBalance', () => {
    /**
     * @target ChainUtils.unwrapAssetBalance should unwrap all values successfully
     * @dependencies
     * @scenario
     * - generate tokenMap object with multi decimals
     * - run test
     * - check returned value
     * @expected
     * - it should return the expected unwrapped values
     */
    it('should unwrap all values successfully', () => {
      // mock an AssetBalance
      const tokenMap = new TokenMap(testTokenMap);

      // run test
      const result = ChainUtils.unwrapAssetBalance(
        wrappedBalance,
        tokenMap,
        'test-native-token',
        'test'
      );

      // check returned value
      expect(result).toEqual(unwrappedBalance);
    });
  });

  describe('encodeOrder', () => {
    /**
     * @target ChainUtils.encodeOrder should NOT mutate the tokens
     * @dependencies
     * @scenario
     * - mock an AssetBalance with unorganized tokens
     * - run test
     * - check returned value
     * @expected
     * - the tokens list should be sorted
     * - the original order token list should remain unchanged
     */
    it('should NOT mutate the tokens', () => {
      // mock an AssetBalance with unorganized tokens
      const a = unorganizedAssetBalance;
      const order: PaymentOrder = [
        {
          address: 'addr2',
          assets: a,
        },
      ];
      const originalTokens = structuredClone(a.tokens);

      // run test
      const result = ChainUtils.encodeOrder(order);

      // check returned value
      const organizedOrder: PaymentOrder = JsonBigInt.parse(result);
      expect(organizedOrder[0].assets).toEqual({
        nativeToken: a.nativeToken,
        tokens: sortedTokens,
      });
      expect(order[0].assets.tokens).toEqual(originalTokens);
    });
  });

  /**
   * @target ChainUtils.encodeOrder should sort the tokens before encoding
   * @dependencies
   * @scenario
   * - mock two AssetBalance with unorganized tokens
   * - run test
   * - check returned value
   * @expected
   * - order should remain the same
   * - the tokens list of each record should be sorted
   */
  it('should sort the tokens before encoding', () => {
    // mock two AssetBalance with unorganized tokens
    const order: PaymentOrder = unorganizedOrder;

    // run test
    const result = ChainUtils.encodeOrder(order);

    // check returned value
    const organizedOrder: PaymentOrder = JsonBigInt.parse(result);
    expect(organizedOrder[0].address).toEqual('addr2');
    expect(organizedOrder[0].assets).toEqual({
      nativeToken: unorganizedAssetBalance.nativeToken,
      tokens: sortedTokens,
    });
    expect(organizedOrder[1].address).toEqual('addr1');
    expect(organizedOrder[1].assets).toEqual({
      nativeToken: 100n,
      tokens: sortedTokens,
    });
  });

  describe('decodeOrder', () => {
    /**
     * @target ChainUtils.decodeOrder should decode the order successfully
     * @dependencies
     * @scenario
     * - run test
     * - check returned value
     * @expected
     * - order should remain the same
     * - the tokens list of each record should be sorted
     */
    it('should decode the order successfully', () => {
      // run test
      const result = ChainUtils.decodeOrder(encodedOrder);

      // check returned value
      expect(result).toEqual(organizedOrder);
    });
  });
});
