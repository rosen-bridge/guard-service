import { AssetBalance, PaymentOrder, TokenInfo } from './types';
import { ValueError } from './errors';
import { TokenMap } from '@rosen-bridge/tokens';
import JsonBigInt from '@rosen-bridge/json-bigint';

class ChainUtils {
  /**
   * compares two AssetBalance
   * @param a first AssetBalance object
   * @param b second AssetBalance object
   * @returns true if are equal
   */
  static isEqualAssetBalance = (a: AssetBalance, b: AssetBalance): boolean => {
    // check native token is equal
    if (a.nativeToken !== b.nativeToken) return false;

    // check all tokens in `a` exist in `b`
    for (let i = 0; i < a.tokens.length; i++) {
      const token = a.tokens[i];
      const targetToken = b.tokens.find((item) => item.id === token.id);
      if (!targetToken || targetToken.value !== token.value) return false;
    }

    // check all tokens in `b` exist in `a`
    for (let i = 0; i < b.tokens.length; i++) {
      const token = b.tokens[i];
      const targetToken = a.tokens.find((item) => item.id === token.id);
      if (!targetToken || targetToken.value !== token.value) return false;
    }

    return true;
  };

  /**
   * sums two AssetBalance
   * @param a first AssetBalance object
   * @param b second AssetBalance object
   * @returns aggregated AssetBalance
   */
  static sumAssetBalance = (a: AssetBalance, b: AssetBalance): AssetBalance => {
    // sum native token
    const nativeToken = a.nativeToken + b.nativeToken;
    const tokens: Array<TokenInfo> = [];

    // add all tokens to result
    [...a.tokens, ...b.tokens].forEach((token) => {
      const targetToken = tokens.find((item) => item.id === token.id);
      if (targetToken) targetToken.value += token.value;
      else tokens.push(structuredClone(token));
    });

    return {
      nativeToken,
      tokens,
    };
  };

  /**
   * subtracts two AssetBalance
   * @param a first AssetBalance object
   * @param b second AssetBalance object
   * @param minimumNativeToken minimum allowed native token
   * @param allowNegativeNativeToken if true, sets nativeToken as 0 instead of throwing error
   * @returns reduced AssetBalance
   */
  static subtractAssetBalance = (
    a: AssetBalance,
    b: AssetBalance,
    minimumNativeToken = 0n,
    allowNegativeNativeToken = false
  ): AssetBalance => {
    // sum native token
    let nativeToken = 0n;
    if (a.nativeToken > b.nativeToken + minimumNativeToken)
      nativeToken = a.nativeToken - b.nativeToken;
    else if (allowNegativeNativeToken) nativeToken = 0n;
    else
      throw new ValueError(
        `Cannot reduce native token: [${a.nativeToken.toString()}] is less than [${b.nativeToken.toString()} + ${minimumNativeToken.toString()}]`
      );

    // reduce all `b` tokens
    const tokens = structuredClone(a.tokens);
    b.tokens.forEach((token) => {
      const index = tokens.findIndex((item) => item.id === token.id);
      if (index !== -1) {
        if (tokens[index].value > token.value)
          tokens[index].value -= token.value;
        else if (tokens[index].value === token.value) tokens.splice(index, 1);
        else
          throw new ValueError(
            `Cannot reduce token [${token.id}]: [${tokens[
              index
            ].value.toString()}] is less than [${token.value.toString()}]`
          );
      } else
        throw new ValueError(
          `Cannot reduce token [${token.id}]: Token not found`
        );
    });

    return {
      nativeToken,
      tokens,
    };
  };

  /**
   * wraps amount of the native token and all tokens in AssetBalance
   * @param a the AssetBalance object
   * @param tokenMap
   * @param nativeTokenId
   * @param chain
   */
  static wrapAssetBalance = (
    a: AssetBalance,
    tokenMap: TokenMap,
    nativeTokenId: string,
    chain: string
  ): AssetBalance => {
    const result = structuredClone(a);
    result.nativeToken = tokenMap.wrapAmount(
      nativeTokenId,
      result.nativeToken,
      chain
    ).amount;
    result.tokens.forEach(
      (token) =>
        (token.value = tokenMap.wrapAmount(token.id, token.value, chain).amount)
    );
    return result;
  };

  /**
   * unwraps amount of the native token and all tokens in AssetBalance
   * @param a the AssetBalance object
   * @param tokenMap
   * @param nativeTokenId
   * @param chain
   */
  static unwrapAssetBalance = (
    a: AssetBalance,
    tokenMap: TokenMap,
    nativeTokenId: string,
    chain: string
  ): AssetBalance => {
    const result = structuredClone(a);
    result.nativeToken = tokenMap.unwrapAmount(
      nativeTokenId,
      result.nativeToken,
      chain
    ).amount;
    result.tokens.forEach(
      (token) =>
        (token.value = tokenMap.unwrapAmount(
          token.id,
          token.value,
          chain
        ).amount)
    );
    return result;
  };

  /**
   * encodes the order to string
   * token placement in single payment should not affect the encoding
   * @param order
   */
  static encodeOrder = (order: PaymentOrder): string => {
    const organizedOrder = order.map((payment) => {
      const organizedPayment = structuredClone(payment);
      organizedPayment.assets.tokens.sort((a, b) => {
        if (a.id === b.id) {
          if (a.value === b.value) return 0;
          else if (a.value > b.value) return 1;
          else return -1;
        } else return a.id > b.id ? 1 : -1;
      });
      return organizedPayment;
    });

    return JsonBigInt.stringify(organizedOrder);
  };

  /**
   * decodes the order from string
   * @param encodedOrder
   */
  static decodeOrder = (encodedOrder: string): PaymentOrder => {
    return JsonBigInt.parse(encodedOrder);
  };
}

export default ChainUtils;
