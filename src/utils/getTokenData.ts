import Configs from '../configs/Configs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import { TokenData } from '../types/api';

/**
 * gets token data from tokenMap
 *  returns UnsupportedToken with 0 decimal if token is not found
 *  reads emission token data from config
 * @param sourceChain
 * @param sourceChainTokenId
 * @param targetChain
 */
export const getTokenData = (
  sourceChain: string,
  sourceChainTokenId: string,
  targetChain: string,
  returnSignificantDecimal = false
): TokenData => {
  if (sourceChainTokenId === GuardsErgoConfigs.emissionTokenId) {
    return {
      tokenId: sourceChainTokenId,
      name: GuardsErgoConfigs.emissionTokenName,
      decimals: GuardsErgoConfigs.emissionTokenDecimal,
      isNativeToken: false,
      amount: 0,
    };
  }

  const tokenMapRes = Configs.tokenMap.search(sourceChain, {
    [Configs.tokenMap.getIdKey(sourceChain)]: sourceChainTokenId,
  });
  if (tokenMapRes.length === 0) {
    // token is not found in token map
    if (sourceChain === targetChain) {
      // source and target chain are same, return unsupported token
      return {
        tokenId: sourceChainTokenId,
        name: 'Unsupported token',
        decimals: 0,
        isNativeToken: false,
        amount: 0,
      };
    } else {
      // cannot fetch token data of another chain if token is not found
      throw Error(
        `token [${sourceChainTokenId}] of chain [${sourceChain}] is not found in TokenMap`
      );
    }
  } else {
    const tokenData = tokenMapRes[0][targetChain];
    const significantDecimals =
      Configs.tokenMap.getSignificantDecimals(sourceChainTokenId);
    const decimals =
      returnSignificantDecimal && significantDecimals !== undefined
        ? significantDecimals
        : tokenData.decimals;
    return {
      tokenId: tokenData[Configs.tokenMap.getIdKey(targetChain)],
      name: tokenData.name,
      amount: 0,
      decimals: decimals,
      isNativeToken: tokenData.metaData.type === 'native',
    };
  }
};
